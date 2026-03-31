package com.appsmith.aiide.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreatePageRequest {

    @NotBlank(message = "name is required")
    @Size(max = 200, message = "name must be at most 200 characters")
    public String name;

    @Size(max = 2000, message = "description must be at most 2000 characters")
    public String description;

    @Pattern(regexp = "^(appsmith|normal)$", message = "type must be 'appsmith' or 'normal'")
    public String type = "appsmith";

    @Size(max = 200, message = "gitBranch must be at most 200 characters")
    public String gitBranch = "dev";

    public String appsmithPageId;
}
