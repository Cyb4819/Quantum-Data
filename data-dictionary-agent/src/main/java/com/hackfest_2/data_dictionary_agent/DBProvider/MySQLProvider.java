package com.hackfest_2.data_dictionary_agent.DBProvider;

import com.hackfest_2.data_dictionary_agent.dto.DBConnectionConfig;
import java.sql.Connection;
import java.sql.DriverManager;
import org.springframework.stereotype.Component;

@Component
public class MySQLProvider implements DBProvider {
  public boolean supports(String type) {
    return "mysql".equalsIgnoreCase(type);
  }

  public Connection connect(DBConnectionConfig config) throws Exception {
    return DriverManager.getConnection(config.getUrl(), config.getUsername(), config.getPassword());
  }
}
