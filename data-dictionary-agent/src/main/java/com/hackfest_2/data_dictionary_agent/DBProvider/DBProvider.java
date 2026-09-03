package com.hackfest_2.data_dictionary_agent.DBProvider;

import com.hackfest_2.data_dictionary_agent.dto.DBConnectionConfig;
import java.sql.Connection;

public interface DBProvider {
  Connection connect(DBConnectionConfig config) throws Exception;

  boolean supports(String type);
}
