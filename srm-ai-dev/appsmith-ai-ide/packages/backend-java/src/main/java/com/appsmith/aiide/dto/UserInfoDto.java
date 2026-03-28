package com.appsmith.aiide.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserInfoDto {

    public String id;
    public String username;
    public String displayName;
    public String role;
    public ActiveCheckoutDto activeCheckout;
}
