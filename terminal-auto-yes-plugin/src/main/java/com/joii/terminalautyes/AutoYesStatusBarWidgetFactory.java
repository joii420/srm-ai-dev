package com.joii.terminalautyes;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.StatusBar;
import com.intellij.openapi.wm.StatusBarWidget;
import com.intellij.openapi.wm.StatusBarWidgetFactory;
import org.jetbrains.annotations.NonNls;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import com.intellij.util.Consumer;

import java.awt.*;
import java.awt.event.MouseEvent;

public class AutoYesStatusBarWidgetFactory implements StatusBarWidgetFactory {

    private static final String WIDGET_ID = "TerminalAutoYesWidget";

    @Override
    public @NonNls @NotNull String getId() {
        return WIDGET_ID;
    }

    @Override
    public @NotNull String getDisplayName() {
        return "Terminal Auto Yes";
    }

    @Override
    public @NotNull StatusBarWidget createWidget(@NotNull Project project) {
        return new AutoYesWidget(project);
    }

    private static class AutoYesWidget implements StatusBarWidget, StatusBarWidget.TextPresentation {

        private final Project project;
        private StatusBar statusBar;
        private final Runnable stateListener;

        AutoYesWidget(Project project) {
            this.project = project;
            this.stateListener = () -> {
                if (statusBar != null) {
                    statusBar.updateWidget(ID());
                }
            };
        }

        @Override
        public @NonNls @NotNull String ID() {
            return WIDGET_ID;
        }

        @Override
        public @NotNull String getText() {
            TerminalAutoYesService service = project.getService(TerminalAutoYesService.class);
            if (!service.isEnabled()) {
                return "Auto: OFF";
            }
            String mode = service.getMonitorMode() == TerminalAutoYesService.MonitorMode.ACTIVE_ONLY
                    ? "Current" : "Global";
            return "Auto: ON [" + mode + "]";
        }

        @Override
        public float getAlignment() {
            return Component.CENTER_ALIGNMENT;
        }

        @Override
        public @Nullable String getTooltipText() {
            TerminalAutoYesService service = project.getService(TerminalAutoYesService.class);
            if (!service.isEnabled()) {
                return "点击开启 Terminal Auto Yes";
            }
            return "左键: 开关 | 右键: 切换监控模式 (" + service.getMonitorMode().getLabel() + ")";
        }

        @Override
        public @Nullable Consumer<MouseEvent> getClickConsumer() {
            return e -> {
                TerminalAutoYesService service = project.getService(TerminalAutoYesService.class);
                // 三态循环: OFF → ON[当前终端] → ON[所有终端] → OFF
                if (!service.isEnabled()) {
                    service.setMonitorMode(TerminalAutoYesService.MonitorMode.ACTIVE_ONLY);
                    service.toggle(); // OFF → ON
                } else if (service.getMonitorMode() == TerminalAutoYesService.MonitorMode.ACTIVE_ONLY) {
                    service.setMonitorMode(TerminalAutoYesService.MonitorMode.ALL_TERMINALS);
                } else {
                    service.toggle(); // ON → OFF
                }
            };
        }

        @Override
        public @NotNull WidgetPresentation getPresentation() {
            return this;
        }

        @Override
        public void install(@NotNull StatusBar statusBar) {
            this.statusBar = statusBar;
            project.getService(TerminalAutoYesService.class).addStateListener(stateListener);
        }

        @Override
        public void dispose() {
            if (!project.isDisposed()) {
                project.getService(TerminalAutoYesService.class).removeStateListener(stateListener);
            }
        }
    }
}
