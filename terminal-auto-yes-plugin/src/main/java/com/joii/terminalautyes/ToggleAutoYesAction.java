package com.joii.terminalautyes;

import com.intellij.notification.Notification;
import com.intellij.notification.NotificationType;
import com.intellij.notification.Notifications;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.ToggleAction;
import com.intellij.openapi.project.Project;
import org.jetbrains.annotations.NotNull;

public class ToggleAutoYesAction extends ToggleAction {

    @Override
    public boolean isSelected(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) return false;
        return project.getService(TerminalAutoYesService.class).isEnabled();
    }

    @Override
    public void setSelected(@NotNull AnActionEvent e, boolean state) {
        Project project = e.getProject();
        if (project == null) return;

        TerminalAutoYesService service = project.getService(TerminalAutoYesService.class);
        service.toggle();

        boolean enabled = service.isEnabled();
        String modeLabel = service.getMonitorMode().getLabel();
        Notifications.Bus.notify(new Notification(
                "Terminal Auto Yes",
                "Terminal Auto Yes",
                enabled ? "自动确认已开启 [" + modeLabel + "]" : "自动确认已关闭",
                enabled ? NotificationType.INFORMATION : NotificationType.WARNING
        ), project);
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        super.update(e);
        e.getPresentation().setEnabledAndVisible(e.getProject() != null);
    }
}
