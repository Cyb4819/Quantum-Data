package com.hackfest_2.data_dictionary_agent.service;

import com.hackfest_2.data_dictionary_agent.dto.DBConnectionConfig;
import java.sql.*;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class QueryService {
  private final DBService dbService;
  private final ConnectionManagerService connectionManagerService;

  public QueryService(DBService dbService, ConnectionManagerService connectionManagerService) {
    this.dbService = dbService;
    this.connectionManagerService = connectionManagerService;
  }

  public List<Map<String, Object>> execute(String sql) throws Exception {
    if (!sql.trim().toLowerCase().startsWith("select")) {
      throw new IllegalArgumentException("Only SELECT queries are allowed");
    }

    DBConnectionConfig config = connectionManagerService.getActiveConfig();

    try (Connection connection = dbService.connect(config);
        Statement statement = connection.createStatement();
        ResultSet rs = statement.executeQuery(sql)) {
      List<Map<String, Object>> results = new ArrayList<>();
      ResultSetMetaData meta = rs.getMetaData();
      int columnCount = meta.getColumnCount();

      while (rs.next()) {
        Map<String, Object> row = new LinkedHashMap<>();

        for (int i = 1; i <= columnCount; i++) {
          row.put(meta.getColumnLabel(i), rs.getObject(i));
        }

        results.add(row);
      }

      return results;
    }
  }
}
