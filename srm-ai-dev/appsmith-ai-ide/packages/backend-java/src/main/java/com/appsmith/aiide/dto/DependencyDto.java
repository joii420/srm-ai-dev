package com.appsmith.aiide.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DependencyDto {

    public String id;
    public String namespace;
    public String url;
    public String version;
    public String description;
    public OffsetDateTime lastLoaded;
    public OffsetDateTime createdAt;
}
