package com.joii.terminalautyes;

import com.intellij.notification.Notification;
import com.intellij.notification.NotificationType;
import com.intellij.notification.Notifications;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.Service;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowManager;
import com.intellij.ui.content.Content;
import com.intellij.ui.content.ContentManager;

import javax.swing.*;
import java.awt.*;
import java.awt.event.KeyEvent;
import java.lang.reflect.Method;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service(Service.Level.PROJECT)
public final class TerminalAutoYesService implements Disposable {

    private static final Logger LOG = Logger.getInstance(TerminalAutoYesService.class);
    private static final Pattern SELECTED_OPTION_PATTERN = Pattern.compile("[❯>]\\s*(\\d+)\\.");
    private static final int CHECK_INTERVAL_MS = 500;
    private static final long DEBOUNCE_MS = 3000;

    public enum MonitorMode {
        ACTIVE_ONLY("当前终端"),
        ALL_TERMINALS("所有终端");

        private final String label;

        MonitorMode(String label) {
            this.label = label;
        }

        public String getLabel() {
            return label;
        }
    }

    private final Project project;
    private volatile boolean enabled = false;
    private volatile MonitorMode monitorMode = MonitorMode.ACTIVE_ONLY;
    private Timer timer;
    private final Map<Integer, DebounceState> debounceMap = new HashMap<>();
    private final AtomicBoolean isSendingKeys = new AtomicBoolean(false);
    private final List<Runnable> stateListeners = new CopyOnWriteArrayList<>();
    private final AtomicInteger confirmCount = new AtomicInteger(0);
    private volatile Notification lastNotification = null;
    private static final SimpleDateFormat TIME_FORMAT = new SimpleDateFormat("HH:mm:ss");

    private static class DebounceState {
        long lastTriggerTime = 0;
        int lastTriggerTextHash = 0;
    }

    public TerminalAutoYesService(Project project) {
        this.project = project;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public MonitorMode getMonitorMode() {
        return monitorMode;
    }

    public void setMonitorMode(MonitorMode mode) {
        this.monitorMode = mode;
        debounceMap.clear();
        stateListeners.forEach(Runnable::run);
    }

    public void switchMonitorMode() {
        setMonitorMode(monitorMode == MonitorMode.ACTIVE_ONLY
                ? MonitorMode.ALL_TERMINALS
                : MonitorMode.ACTIVE_ONLY);
    }

    public void toggle() {
        enabled = !enabled;
        if (enabled) {
            startMonitoring();
        } else {
            stopMonitoring();
            debounceMap.clear();
            confirmCount.set(0);
            if (lastNotification != null) {
                lastNotification.expire();
                lastNotification = null;
            }
        }
        stateListeners.forEach(Runnable::run);
    }

    public void addStateListener(Runnable listener) {
        stateListeners.add(listener);
    }

    public void removeStateListener(Runnable listener) {
        stateListeners.remove(listener);
    }

    private void startMonitoring() {
        if (timer != null) return;
        timer = new Timer(CHECK_INTERVAL_MS, e -> checkTerminal());
        timer.start();
        LOG.info("Terminal Auto Yes: monitoring started");
    }

    private void stopMonitoring() {
        if (timer != null) {
            timer.stop();
            timer = null;
        }
        LOG.info("Terminal Auto Yes: monitoring stopped");
    }

    private void checkTerminal() {
        if (!enabled || project.isDisposed()) return;

        ToolWindow tw = ToolWindowManager.getInstance(project).getToolWindow("Terminal");
        if (tw == null || !tw.isVisible()) return;

        ContentManager cm = tw.getContentManager();

        if (monitorMode == MonitorMode.ACTIVE_ONLY) {
            Content selected = cm.getSelectedContent();
            if (selected != null) {
                checkSingleTerminal(selected, true);
            }
        } else {
            Content selected = cm.getSelectedContent();
            for (Content content : cm.getContents()) {
                boolean isActive = content == selected;
                checkSingleTerminal(content, isActive);
            }
        }
    }

    private void checkSingleTerminal(Content content, boolean isActive) {
        JComponent component = content.getComponent();
        String screenText = readTerminalText(component);
        if (screenText == null || screenText.isEmpty()) return;

        PromptDetection detection = detectPrompt(screenText);
        if (detection.detected && detection.targetOption > 0) {
            int contentKey = System.identityHashCode(content);
            DebounceState state = debounceMap.computeIfAbsent(contentKey, k -> new DebounceState());

            int textHash = screenText.hashCode();
            long now = System.currentTimeMillis();
            if (textHash != state.lastTriggerTextHash || now - state.lastTriggerTime > DEBOUNCE_MS) {
                state.lastTriggerTextHash = textHash;
                state.lastTriggerTime = now;
                String tabName = content.getDisplayName();
                LOG.info("Terminal Auto Yes: prompt in [" + tabName + "], current=" + detection.currentOption + ", target=" + detection.targetOption);
                sendAutoYes(component, detection.currentOption, detection.targetOption, isActive, tabName);
            }
        }
    }

    // ---- Terminal text reading ----

    private String readTerminalText(JComponent root) {
        // Strategy 1: Classic terminal (JediTerm / JBTerminalWidget)
        String text = readClassicTerminal(root);
        if (text != null) return text;

        // Strategy 2: Reworked terminal (Editor-based)
        text = readReworkedTerminal(root);
        if (text != null) return text;

        return null;
    }

    private String readClassicTerminal(Component root) {
        // Find JBTerminalWidget via class name (avoid hard import for forward compatibility)
        Component widget = findComponentByClassName(root,
                "com.intellij.terminal.JBTerminalWidget",
                "org.jetbrains.plugins.terminal.ShellTerminalWidget");
        if (widget == null) return null;

        try {
            // widget.getTerminalTextBuffer() or widget.getTerminal().getTerminalTextBuffer()
            Object buffer = tryInvokeChain(widget,
                    new String[]{"getTerminalTextBuffer"},
                    new String[]{"getTerminal", "getTerminalTextBuffer"});
            if (buffer == null) return null;

            Method lockMethod = buffer.getClass().getMethod("lock");
            Method unlockMethod = buffer.getClass().getMethod("unlock");
            Method getScreenLinesCount = buffer.getClass().getMethod("getScreenLinesCount");
            Method getLine = buffer.getClass().getMethod("getLine", int.class);

            lockMethod.invoke(buffer);
            try {
                int count = (int) getScreenLinesCount.invoke(buffer);
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < count; i++) {
                    Object line = getLine.invoke(buffer, i);
                    Method getText = line.getClass().getMethod("getText");
                    sb.append(getText.invoke(line)).append('\n');
                }
                return sb.toString();
            } finally {
                unlockMethod.invoke(buffer);
            }
        } catch (Exception e) {
            LOG.debug("Failed to read classic terminal", e);
            return null;
        }
    }

    private String readReworkedTerminal(Component root) {
        // The reworked terminal renders output using IntelliJ Editor components
        List<Component> editorComponents = new ArrayList<>();
        findComponentsByClassName(root, editorComponents,
                "com.intellij.openapi.editor.impl.EditorComponentImpl");

        if (editorComponents.isEmpty()) return null;

        StringBuilder allText = new StringBuilder();
        for (Component comp : editorComponents) {
            try {
                Method getEditor = comp.getClass().getMethod("getEditor");
                Object editor = getEditor.invoke(comp);
                Method getDocument = editor.getClass().getMethod("getDocument");
                Object document = getDocument.invoke(editor);
                Method getText = document.getClass().getMethod("getText");
                String text = (String) getText.invoke(document);
                allText.append(text).append('\n');
            } catch (Exception e) {
                LOG.debug("Failed to read editor text", e);
            }
        }

        return allText.length() > 0 ? allText.toString() : null;
    }

    // ---- Prompt detection ----

    private static final Pattern OPTION_LINE_PATTERN = Pattern.compile("^\\s*[❯>]?\\s*(\\d+)\\.\\s*(.+)$");

    private static class PromptDetection {
        final boolean detected;
        final int currentOption;  // ❯ 当前选中的选项编号
        final int targetOption;   // 需要导航到的目标选项编号

        PromptDetection(boolean detected, int currentOption, int targetOption) {
            this.detected = detected;
            this.currentOption = currentOption;
            this.targetOption = targetOption;
        }
    }

    private PromptDetection detectPrompt(String text) {
        String[] lines = text.split("\n");

        // 从末尾往前找 ❯ 标记行
        for (int i = lines.length - 1; i >= Math.max(0, lines.length - 30); i--) {
            String line = lines[i];

            if (!line.contains("❯")) continue;

            Matcher m = SELECTED_OPTION_PATTERN.matcher(line);
            if (!m.find()) continue;

            int currentOption = Integer.parseInt(m.group(1));

            // 收集 ❯ 附近的所有选项行（上下各搜索10行）
            List<OptionInfo> options = new ArrayList<>();
            int searchStart = Math.max(0, i - 10);
            int searchEnd = Math.min(lines.length, i + 10);

            for (int j = searchStart; j < searchEnd; j++) {
                Matcher om = OPTION_LINE_PATTERN.matcher(lines[j]);
                if (om.find()) {
                    int num = Integer.parseInt(om.group(1));
                    String label = om.group(2).trim();
                    options.add(new OptionInfo(num, label));
                }
            }

            if (options.isEmpty()) continue;

            // 找出所有包含 "Yes" 的选项
            List<OptionInfo> yesOptions = new ArrayList<>();
            for (OptionInfo opt : options) {
                if (opt.label.toLowerCase().startsWith("yes")) {
                    yesOptions.add(opt);
                }
            }

            if (yesOptions.isEmpty()) continue;

            // 两个以上 Yes 选最后一个（"Yes, and don't ask again"），只有一个就选那个
            int targetOption;
            if (yesOptions.size() >= 2) {
                targetOption = yesOptions.get(yesOptions.size() - 1).number;
            } else {
                targetOption = yesOptions.get(0).number;
            }

            return new PromptDetection(true, currentOption, targetOption);
        }

        return new PromptDetection(false, -1, -1);
    }

    private static class OptionInfo {
        final int number;
        final String label;

        OptionInfo(int number, String label) {
            this.number = number;
            this.label = label;
        }
    }

    // ---- Key sending ----

    private void sendAutoYes(JComponent terminalComponent, int currentOption, int targetOption, boolean isActive, String tabName) {
        if (!isSendingKeys.compareAndSet(false, true)) return;

        int delta = targetOption - currentOption;

        new Thread(() -> {
            try {
                boolean sent = false;
                if (sendViaTtyConnector(terminalComponent, delta)) {
                    sent = true;
                } else if (isActive) {
                    sendViaRobot(delta);
                    sent = true;
                } else {
                    LOG.warn("Terminal Auto Yes: non-active tab uses reworked terminal, cannot send keys without focus");
                }

                if (sent) {
                    int count = confirmCount.incrementAndGet();
                    String time = TIME_FORMAT.format(new Date());
                    ApplicationManager.getApplication().invokeLater(() -> showConfirmNotification(count, time, tabName));
                }
            } finally {
                isSendingKeys.set(false);
            }
        }, "TerminalAutoYes-KeySender").start();
    }

    private void showConfirmNotification(int count, String time, String tabName) {
        if (lastNotification != null) {
            lastNotification.expire();
        }
        Notification notification = new Notification(
                "Terminal Auto Yes",
                "Terminal Auto",
                "[" + tabName + "] 已自动确认 " + count + " 次 | 最近确认: " + time,
                NotificationType.INFORMATION
        );
        lastNotification = notification;
        Notifications.Bus.notify(notification, project);
    }

    private boolean sendViaTtyConnector(Component root, int delta) {
        Component widget = findComponentByClassName(root,
                "com.intellij.terminal.JBTerminalWidget",
                "org.jetbrains.plugins.terminal.ShellTerminalWidget");
        if (widget == null) return false;

        try {
            Method getConnector = widget.getClass().getMethod("getTtyConnector");
            Object connector = getConnector.invoke(widget);
            if (connector == null) return false;

            Method isConnected = connector.getClass().getMethod("isConnected");
            if (!(boolean) isConnected.invoke(connector)) return false;

            Method write = connector.getClass().getMethod("write", String.class);

            String arrowSeq = delta < 0 ? "\033[A" : "\033[B"; // Up or Down
            int steps = Math.abs(delta);
            for (int i = 0; i < steps; i++) {
                write.invoke(connector, arrowSeq);
                Thread.sleep(30);
            }
            Thread.sleep(1000); // 切换选项后等待1秒再确认
            write.invoke(connector, "\r"); // Enter

            LOG.info("Terminal Auto Yes: sent via TtyConnector (delta=" + delta + ", target reached)");
            return true;
        } catch (Exception e) {
            LOG.debug("TtyConnector key sending failed", e);
            return false;
        }
    }

    private void sendViaRobot(int delta) {
        try {
            Robot robot = new Robot();
            int key = delta < 0 ? KeyEvent.VK_UP : KeyEvent.VK_DOWN;
            int steps = Math.abs(delta);
            for (int i = 0; i < steps; i++) {
                robot.keyPress(key);
                robot.keyRelease(key);
                Thread.sleep(30);
            }
            Thread.sleep(1000); // 切换选项后等待1秒再确认
            robot.keyPress(KeyEvent.VK_ENTER);
            robot.keyRelease(KeyEvent.VK_ENTER);

            LOG.info("Terminal Auto Yes: sent via Robot (delta=" + delta + ", target reached)");
        } catch (Exception e) {
            LOG.warn("Robot key sending failed", e);
        }
    }

    // ---- Component traversal utilities ----

    private static Component findComponentByClassName(Component root, String... classNames) {
        String rootClassName = root.getClass().getName();
        for (String name : classNames) {
            if (rootClassName.equals(name)) return root;
        }

        if (root instanceof Container) {
            for (Component child : ((Container) root).getComponents()) {
                Component found = findComponentByClassName(child, classNames);
                if (found != null) return found;
            }
        }
        return null;
    }

    private static void findComponentsByClassName(Component root, List<Component> results, String... classNames) {
        String rootClassName = root.getClass().getName();
        for (String name : classNames) {
            if (rootClassName.equals(name)) {
                results.add(root);
                break;
            }
        }

        if (root instanceof Container) {
            for (Component child : ((Container) root).getComponents()) {
                findComponentsByClassName(child, results, classNames);
            }
        }
    }

    private static Object tryInvokeChain(Object target, String[]... chains) {
        for (String[] chain : chains) {
            try {
                Object result = target;
                for (String methodName : chain) {
                    Method m = result.getClass().getMethod(methodName);
                    result = m.invoke(result);
                    if (result == null) break;
                }
                if (result != null) return result;
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    @Override
    public void dispose() {
        stopMonitoring();
        stateListeners.clear();
    }
}
