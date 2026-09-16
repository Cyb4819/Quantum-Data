package com.hackfest_2.data_dictionary_agent.dto;

import lombok.Data;

@Data
public class DBConnectionConfig {
  private String type;
  private String url;
  private String username;
  private String password;
}
