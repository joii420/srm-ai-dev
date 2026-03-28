package com.appsmith.aiide.service;

import com.jcraft.jsch.JSch;
import com.jcraft.jsch.JSchException;
import com.jcraft.jsch.Session;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.PushCommand;
import org.eclipse.jgit.api.TransportConfigCallback;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.lib.ObjectId;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;
import org.eclipse.jgit.transport.*;
import org.eclipse.jgit.transport.ssh.jsch.JschConfigSessionFactory;
import org.eclipse.jgit.transport.ssh.jsch.OpenSshConfig;
import org.eclipse.jgit.util.FS;
import org.jboss.logging.Logger;

import java.io.File;
import java.nio.file.Path;

/**
 * Git operations backed by JGit with SSH transport support.
 */
@ApplicationScoped
public class GitService {

    private static final Logger LOG = Logger.getLogger(GitService.class);

    /**
     * Result of a commit-and-push operation.
     */
    public record CommitResult(String commitHash, boolean success, String error) {
    }

    /**
     * Clones a repository over SSH using a custom private key.
     *
     * @param repoUrl    the SSH Git URL (e.g. git@gitlab.internal:group/repo.git)
     * @param branch     the branch to clone
     * @param destPath   the local directory to clone into
     * @param sshKeyPath path to the SSH private key file
     */
    public void cloneRepo(String repoUrl, String branch, String destPath, String sshKeyPath) {
        LOG.infof("Cloning repo=%s branch=%s into %s", repoUrl, branch, destPath);
        try {
            Git.cloneRepository()
                    .setURI(repoUrl)
                    .setBranch(branch)
                    .setDirectory(new File(destPath))
                    .setTransportConfigCallback(createSshTransport(sshKeyPath))
                    .call()
                    .close();
            LOG.infof("Clone complete: %s", destPath);
        } catch (GitAPIException e) {
            LOG.errorf("Clone failed for %s: %s", repoUrl, e.getMessage());
            throw new RuntimeException("Git clone failed: " + e.getMessage(), e);
        }
    }

    /**
     * Reads the HEAD commit hash from a local repository.
     *
     * @param repoPath path to the local git repository
     * @return the full SHA-1 hash of HEAD
     */
    public String getHeadCommitHash(String repoPath) {
        try {
            Repository repo = new FileRepositoryBuilder()
                    .setGitDir(Path.of(repoPath, ".git").toFile())
                    .readEnvironment()
                    .build();
            ObjectId head = repo.resolve("HEAD");
            repo.close();
            return head != null ? head.getName() : null;
        } catch (Exception e) {
            LOG.errorf("Failed to read HEAD for %s: %s", repoPath, e.getMessage());
            throw new RuntimeException("Failed to read HEAD commit", e);
        }
    }

    /**
     * Stages all changes, commits, and pushes to the remote.
     * Detects merge conflicts during push.
     *
     * @param repoPath   path to the local git repository
     * @param message    the commit message
     * @param branch     the branch to push to
     * @param sshKeyPath path to the SSH private key file
     * @return a {@link CommitResult} with the outcome
     */
    public CommitResult commitAndPush(String repoPath, String message, String branch, String sshKeyPath) {
        LOG.infof("Committing and pushing in %s to branch %s", repoPath, branch);
        try (Git git = Git.open(new File(repoPath))) {
            // Stage all changes
            git.add().addFilepattern(".").call();

            // Also stage deletions
            git.add().addFilepattern(".").setUpdate(true).call();

            // Check if there are staged changes
            var status = git.status().call();
            if (status.isClean()) {
                LOG.info("Working tree is clean, nothing to commit");
                String headHash = getHeadCommitHash(repoPath);
                return new CommitResult(headHash, true, null);
            }

            // Commit
            var commit = git.commit()
                    .setMessage(message)
                    .call();
            String commitHash = commit.getId().getName();
            LOG.infof("Committed: %s", commitHash);

            // Push
            PushCommand pushCmd = git.push()
                    .setRemote("origin")
                    .setRefSpecs(new RefSpec(branch + ":" + branch))
                    .setTransportConfigCallback(createSshTransport(sshKeyPath));

            Iterable<PushResult> pushResults = pushCmd.call();
            for (PushResult pushResult : pushResults) {
                for (RemoteRefUpdate update : pushResult.getRemoteUpdates()) {
                    if (update.getStatus() == RemoteRefUpdate.Status.REJECTED_NONFASTFORWARD) {
                        LOG.warnf("Push rejected (non-fast-forward) for branch %s", branch);
                        return new CommitResult(commitHash, false, "CONFLICT: non-fast-forward push rejected");
                    }
                    if (update.getStatus() != RemoteRefUpdate.Status.OK
                            && update.getStatus() != RemoteRefUpdate.Status.UP_TO_DATE) {
                        String err = "Push failed: " + update.getStatus() + " - " + update.getMessage();
                        LOG.warnf(err);
                        return new CommitResult(commitHash, false, err);
                    }
                }
            }

            LOG.infof("Push successful for commit %s", commitHash);
            return new CommitResult(commitHash, true, null);
        } catch (Exception e) {
            LOG.errorf("commitAndPush failed: %s", e.getMessage());
            return new CommitResult(null, false, e.getMessage());
        }
    }

    /**
     * Creates a JGit transport callback that uses the specified SSH private key.
     */
    private TransportConfigCallback createSshTransport(String sshKeyPath) {
        SshSessionFactory sshSessionFactory = new JschConfigSessionFactory() {
            @Override
            protected void configure(OpenSshConfig.Host host, Session session) {
                session.setConfig("StrictHostKeyChecking", "no");
            }

            @Override
            protected JSch createDefaultJSch(FS fs) throws JSchException {
                JSch jsch = super.createDefaultJSch(fs);
                jsch.addIdentity(sshKeyPath);
                return jsch;
            }
        };

        return transport -> {
            if (transport instanceof SshTransport sshTransport) {
                sshTransport.setSshSessionFactory(sshSessionFactory);
            }
        };
    }
}
