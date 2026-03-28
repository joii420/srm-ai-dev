package com.appsmith.aiide.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SystemConfigDto {

    public String key;
    public Object value;
    public String description;
}
