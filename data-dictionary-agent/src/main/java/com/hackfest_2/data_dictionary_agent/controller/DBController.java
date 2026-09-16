package com.hackfest_2.data_dictionary_agent.controller;

import com.hackfest_2.data_dictionary_agent.dto.DBConnectionConfig;
import com.hackfest_2.data_dictionary_agent.service.ConnectionManagerService;
import com.hackfest_2.data_dictionary_agent.service.DBService;
import java.sql.Connection;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/db")
public class DBController {
  private final ConnectionManagerService connectionManagerService;
  private final DBService dbService;

  public DBController(ConnectionManagerService connectionManagerService, DBService dbService) {
    this.connectionManagerService = connectionManagerService;
    this.dbService = dbService;
  }

  @PostMapping("/connect")
  public Map<String, Object> connect(@RequestBody DBConnectionConfig dbConnectionConfig)
      throws Exception {
    try (Connection ignored = dbService.connect(dbConnectionConfig)) {
      connectionManagerService.setActiveConfig(dbConnectionConfig);

      return Map.of(
          "status", "ok",
          "message", "Database connected",
          "type", dbConnectionConfig.getType());
    }
  }
}
