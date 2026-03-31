package com.joii.terminalautyes;

import com.intellij.notification.Notification;
import com.intellij.notification.NotificationType;
import com.intellij.notification.Notifications;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.project.Project;
import org.jetbrains.annotations.NotNull;

public class SwitchMonitorModeAction extends AnAction {

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) return;

        TerminalAutoYesService service = project.getService(TerminalAutoYesService.class);
        service.switchMonitorMode();

        String modeLabel = service.getMonitorMode().getLabel();
        Notifications.Bus.notify(new Notification(
                "Terminal Auto Yes",
                "Terminal Auto Yes",
                "监控模式已切换为: " + modeLabel,
                NotificationType.INFORMATION
        ), project);
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) {
            e.getPresentation().setEnabledAndVisible(false);
            return;
        }

        TerminalAutoYesService service = project.getService(TerminalAutoYesService.class);
        String modeLabel = service.getMonitorMode().getLabel();
        e.getPresentation().setText("Auto Yes Mode: " + modeLabel);
        e.getPresentation().setDescription("当前: " + modeLabel + ", 点击切换");
    }
}
