package com.hackfest_2.data_dictionary_agent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.hackfest_2.data_dictionary_agent.dto.DBConnectionConfig;
import com.hackfest_2.data_dictionary_agent.dto.LLMQueryResponse;
import com.mongodb.ConnectionString;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.bson.types.Decimal128;
import org.bson.types.ObjectId;
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
    return executeSql(sql, connectionManagerService.getActiveConfig());
  }

  public List<Map<String, Object>> execute(LLMQueryResponse query, DBConnectionConfig config)
      throws Exception {
    DBConnectionConfig selectedConfig =
        config == null ? connectionManagerService.getActiveConfig() : config;
    if ("mongodb".equalsIgnoreCase(selectedConfig.getType())) {
      return executeMongoQuery(query, selectedConfig);
    }
    return executeSql(query.sql(), selectedConfig);
  }

  private List<Map<String, Object>> executeSql(String sql, DBConnectionConfig config)
      throws Exception {
    if (sql == null || !sql.trim().toLowerCase().startsWith("select")) {
      throw new IllegalArgumentException("Only SELECT queries are allowed");
    }

    try (Connection connection = dbService.connectJdbc(config);
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

  private List<Map<String, Object>> executeMongoQuery(
      LLMQueryResponse query, DBConnectionConfig config) throws Exception {
    if (query.collection() == null || query.collection().isBlank()) {
      throw new IllegalArgumentException("MongoDB collection was not identified");
    }

    try (MongoClient client = (MongoClient) dbService.connect(config)) {
      String databaseName = config.getDatabase();
      if (databaseName == null || databaseName.isBlank()) {
        databaseName = new ConnectionString(config.getUri()).getDatabase();
      }
      if (databaseName == null || databaseName.isBlank()) {
        throw new IllegalArgumentException("MongoDB database is required");
      }

      MongoDatabase database = client.getDatabase(databaseName);
      MongoCollection<Document> collection = database.getCollection(query.collection());
      Document filter = documentFromJson(query.filter());
      Document projection = documentFromJson(query.projection());
      int limit = query.limit() == null ? 100 : Math.min(Math.max(query.limit(), 1), 1000);

      List<Document> documents =
          collection.find(filter).projection(projection).limit(limit).into(new ArrayList<>());
      List<Map<String, Object>> results = new ArrayList<>();
      for (Document document : documents) {
        results.add(toMap(document));
      }
      return results;
    }
  }

  private Document documentFromJson(JsonNode value) {
    if (value == null || value.isNull()) {
      return new Document();
    }
    if (!value.isObject()) {
      throw new IllegalArgumentException("MongoDB filter and projection must be JSON objects");
    }
    return Document.parse(value.toString());
  }

  private Map<String, Object> toMap(Map<String, Object> source) {
    Map<String, Object> result = new LinkedHashMap<>();
    source.forEach((key, value) -> result.put(key, toJsonSafe(value)));
    return result;
  }

  private Object toJsonSafe(Object value) {
    if (value instanceof Map<?, ?> map) {
      Map<String, Object> result = new LinkedHashMap<>();
      map.forEach((key, nested) -> result.put(String.valueOf(key), toJsonSafe(nested)));
      return result;
    }
    if (value instanceof Iterable<?> iterable) {
      List<Object> result = new ArrayList<>();
      iterable.forEach(item -> result.add(toJsonSafe(item)));
      return result;
    }
    if (value instanceof ObjectId objectId) {
      return objectId.toHexString();
    }
    if (value instanceof java.util.Date date) {
      return Instant.ofEpochMilli(date.getTime()).toString();
    }
    if (value instanceof Decimal128 decimal) {
      return decimal.toString();
    }
    if (value instanceof byte[] bytes) {
      return Base64.getEncoder().encodeToString(bytes);
    }
    return value;
  }
}
