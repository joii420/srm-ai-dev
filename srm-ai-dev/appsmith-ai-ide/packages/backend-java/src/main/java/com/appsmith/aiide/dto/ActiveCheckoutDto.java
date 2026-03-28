package com.appsmith.aiide.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActiveCheckoutDto {

    public String pageId;
    public String pageName;
    public String containerId;
    public String sessionId;
}
