package com.appsmith.aiide.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SystemConfigDto {

    public String key;
    public String name;
    public Object value;
    public String description;
    public String type;        // "input" or "dropdown"
    public Object datasource;  // dropdown options: [{"text":"..","value":".."}]
}
