package com.appsmith.aiide.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SshKeyRequest {

    @NotBlank
    public String privateKey;

    @NotBlank
    public String gitlabDomain;
}
