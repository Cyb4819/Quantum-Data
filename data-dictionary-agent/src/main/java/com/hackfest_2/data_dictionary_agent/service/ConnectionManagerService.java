package com.hackfest_2.data_dictionary_agent.service;

import com.hackfest_2.data_dictionary_agent.dto.DBConnectionConfig;
import org.springframework.stereotype.Service;

@Service
public class ConnectionManagerService {
  private DBConnectionConfig activeConfig;

  public void setActiveConfig(DBConnectionConfig config) {
    this.activeConfig = config;
  }

  public DBConnectionConfig getActiveConfig() {
    if (activeConfig == null) {
      throw new IllegalStateException("No active database connection");
    }

    return activeConfig;
  }
}
