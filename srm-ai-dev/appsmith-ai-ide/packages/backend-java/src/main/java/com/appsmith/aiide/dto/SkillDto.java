package com.appsmith.aiide.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SkillDto {

    public String id;
    public String name;
    public String description;
    public String icon;
    public String category;
    public String prompt;
    public Object keywords;
    public Object tags;
    public Integer callCount;
    public Boolean enabled;
    public String version;
    public List<SkillFieldDto> fields;
    public OffsetDateTime createdAt;
    public OffsetDateTime updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillFieldDto {
        public String id;
        public String fieldId;
        public String label;
        public String type;
        public Boolean required;
        public String placeholder;
        public Object options;
        public String token;
        public Integer sortOrder;
    }
}
