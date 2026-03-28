package com.appsmith.aiide.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PageDto {

    public String id;
    public String name;
    public String type;
    public String description;
    public String gitlabRepoUrl;
    public String gitBranch;
    public String appsmithEditUrl;
    public String status;
    public Object checkedOutBy;  // null | { username, displayName }

    /**
     * Build from Page entity, with checkout status computed separately.
     */
    public static PageDto from(com.appsmith.aiide.entity.Page page) {
        PageDto dto = new PageDto();
        dto.id = page.id.toString();
        dto.name = page.name;
        dto.type = page.type;
        dto.description = page.description;
        dto.gitlabRepoUrl = page.gitlabRepoUrl;
        dto.gitBranch = page.gitBranch;
        dto.appsmithEditUrl = page.appsmithEditUrl;
        dto.status = "free";
        dto.checkedOutBy = null;
        return dto;
    }

    public void setCheckedOutByUser(String username, String displayName) {
        this.checkedOutBy = Map.of(
                "username", username != null ? username : "unknown",
                "displayName", displayName != null ? displayName : (username != null ? username : "unknown")
        );
    }
}
