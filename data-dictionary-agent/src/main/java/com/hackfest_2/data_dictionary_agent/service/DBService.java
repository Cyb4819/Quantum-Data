package com.hackfest_2.data_dictionary_agent.service;

import com.hackfest_2.data_dictionary_agent.DBProvider.DBProvider;
import com.hackfest_2.data_dictionary_agent.dto.DBConnectionConfig;
import java.sql.Connection;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DBService {
  private final List<DBProvider> providers;

  public DBService(List<DBProvider> providers) {
    this.providers = providers;
  }

  public Connection connect(DBConnectionConfig config) throws Exception {
    return providers.stream()
        .filter(p -> p.supports(config.getType()))
        .findFirst()
        .orElseThrow(
            () -> new IllegalArgumentException("Unsupported database: " + config.getType()))
        .connect(config);
  }
}
