package com.hackfest_2.data_dictionary_agent.DBProvider;

import com.hackfest_2.data_dictionary_agent.dto.DBConnectionConfig;
import com.mongodb.ConnectionString;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.bson.Document;
import org.springframework.stereotype.Component;

@Component
public class MongoDBProvider implements DBProvider {
  @Override
  public boolean supports(String type) {
    return "mongodb".equalsIgnoreCase(type);
  }

  @Override
  public MongoClient connect(DBConnectionConfig config) {
    String uri = config.getUri();
    if (uri == null || uri.isBlank()) {
      throw new IllegalArgumentException("MongoDB URI is required");
    }

    MongoClient client = MongoClients.create(uri);
    try {
      String database = databaseName(config, uri);
      client.getDatabase(database).runCommand(new Document("ping", 1));
      return client;
    } catch (RuntimeException error) {
      client.close();
      throw error;
    }
  }

  public String databaseName(DBConnectionConfig config, String uri) {
    if (config.getDatabase() != null && !config.getDatabase().isBlank()) {
      return config.getDatabase();
    }

    String database = new ConnectionString(uri).getDatabase();
    if (database == null || database.isBlank()) {
      throw new IllegalArgumentException("MongoDB database is required");
    }
    return database;
  }
}
