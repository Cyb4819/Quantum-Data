package com.hackfest_2.data_dictionary_agent.service;

import com.hackfest_2.data_dictionary_agent.dto.DBConnectionConfig;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import org.bson.Document;
import org.springframework.stereotype.Service;

@Service
public class MetadataService {
  private final DBService dbService;

  public MetadataService(DBService dbService) {
    this.dbService = dbService;
  }

  public List<Map<String, Object>> extractFromMultipleSources(
      List<Map<String, String>> sources) throws Exception {
    List<Map<String, Object>> allSourcesData = new ArrayList<>();

    for (Map<String, String> source : sources) {
      String type = source.get("type");
      if (type == null || type.isBlank()) {
        throw new IllegalArgumentException("Database type is required");
      }

      DBConnectionConfig config = connectionConfig(source);
      Map<String, Object> sourceData =
          "mongodb".equalsIgnoreCase(type)
              ? extractFromMongoSource(config)
              : extractFromJdbcSource(config);
      sourceData.put("sourceName", source.getOrDefault("name", type));
      allSourcesData.add(sourceData);
    }
    return allSourcesData;
  }

  private Map<String, Object> extractFromJdbcSource(DBConnectionConfig config) throws Exception {
    List<Map<String, Object>> tablesList = new ArrayList<>();

    try (Connection connection = dbService.connectJdbc(config)) {
      String catalog = connection.getCatalog();
      DatabaseMetaData metaData = connection.getMetaData();

      try (ResultSet tables = metaData.getTables(catalog, null, "%", new String[] {"TABLE"})) {
        while (tables.next()) {
          String tableName = tables.getString("TABLE_NAME");
          Map<String, Object> tableData = new HashMap<>();
          tableData.put("tableName", tableName);
          tableData.put("tableType", tables.getString("TABLE_TYPE"));

          try (Statement statement = connection.createStatement();
              ResultSet rowCount =
                  statement.executeQuery("select count(*) from " + quoteIdentifier(metaData, tableName))) {
            rowCount.next();
            tableData.put("rowCount", rowCount.getLong(1));
          }

          Set<String> uniqueColumnNames = new HashSet<>();
          try (ResultSet indexes = metaData.getIndexInfo(catalog, null, tableName, true, false)) {
            while (indexes.next()) {
              String column = indexes.getString("COLUMN_NAME");
              if (column != null) {
                uniqueColumnNames.add(column);
              }
            }
          }

          List<Map<String, Object>> columnList = new ArrayList<>();
          try (ResultSet columns = metaData.getColumns(catalog, null, tableName, null)) {
            while (columns.next()) {
              Map<String, Object> columnData = new HashMap<>();
              String columnName = columns.getString("COLUMN_NAME");
              columnData.put("columnName", columnName);
              columnData.put("dataType", columns.getString("TYPE_NAME"));
              columnData.put("size", columns.getInt("COLUMN_SIZE"));
              columnData.put(
                  "nullable",
                  columns.getInt("NULLABLE") == DatabaseMetaData.columnNullable);
              columnData.put("defaultValue", columns.getString("COLUMN_DEF"));
              columnData.put("autoIncrement", columns.getString("IS_AUTOINCREMENT"));
              columnData.put("ordinalPosition", columns.getShort("ORDINAL_POSITION"));
              columnData.put("isUnique", uniqueColumnNames.contains(columnName));
              columnList.add(columnData);
            }
          }
          tableData.put("columns", columnList);

          List<String> primaryKeys = new ArrayList<>();
          try (ResultSet keys = metaData.getPrimaryKeys(catalog, null, tableName)) {
            while (keys.next()) {
              primaryKeys.add(keys.getString("COLUMN_NAME"));
            }
          }
          tableData.put("primaryKeys", primaryKeys);

          List<Map<String, String>> foreignKeys = new ArrayList<>();
          try (ResultSet keys = metaData.getImportedKeys(catalog, null, tableName)) {
            while (keys.next()) {
              Map<String, String> fkData = new HashMap<>();
              fkData.put("fkColumn", keys.getString("FKCOLUMN_NAME"));
              fkData.put("pkTable", keys.getString("PKTABLE_NAME"));
              fkData.put("pkColumn", keys.getString("PKCOLUMN_NAME"));
              foreignKeys.add(fkData);
            }
          }
          tableData.put("foreignKeys", foreignKeys);
          tablesList.add(tableData);
        }
      }
    }

    Map<String, Object> sourceData = new HashMap<>();
    sourceData.put("tablesList", tablesList);
    return sourceData;
  }

  private Map<String, Object> extractFromMongoSource(DBConnectionConfig config) throws Exception {
    List<Map<String, Object>> tablesList = new ArrayList<>();

    try (MongoClient client = (MongoClient) dbService.connect(config)) {
      String databaseName = new com.mongodb.ConnectionString(config.getUri()).getDatabase();
      if (config.getDatabase() != null && !config.getDatabase().isBlank()) {
        databaseName = config.getDatabase();
      }
      MongoDatabase database = client.getDatabase(databaseName);

      for (String collectionName : database.listCollectionNames()) {
        if (collectionName.startsWith("system.")) {
          continue;
        }

        MongoCollection<Document> collection = database.getCollection(collectionName);
        Map<String, Set<String>> fieldTypes = new TreeMap<>();
        int sampledDocuments = 0;
        for (Document document : collection.find().limit(100)) {
          sampledDocuments++;
          for (Map.Entry<String, Object> field : document.entrySet()) {
            fieldTypes
                .computeIfAbsent(field.getKey(), ignored -> new TreeSet<>())
                .add(mongoType(field.getValue()));
          }
        }

        List<Map<String, Object>> columns = new ArrayList<>();
        for (Map.Entry<String, Set<String>> field : fieldTypes.entrySet()) {
          Map<String, Object> column = new HashMap<>();
          column.put("columnName", field.getKey());
          column.put("dataType", String.join(", ", field.getValue()));
          column.put("nullable", true);
          columns.add(column);
        }

        Map<String, Object> table = new HashMap<>();
        table.put("tableName", collectionName);
        table.put("tableType", "COLLECTION");
        table.put("sampledDocumentCount", sampledDocuments);
        table.put("columns", columns);
        tablesList.add(table);
      }
    }

    Map<String, Object> sourceData = new HashMap<>();
    sourceData.put("tablesList", tablesList);
    return sourceData;
  }

  private DBConnectionConfig connectionConfig(Map<String, String> source) {
    DBConnectionConfig config = new DBConnectionConfig();
    config.setType(source.get("type"));
    config.setUrl(source.get("url"));
    config.setUri(source.get("uri"));
    config.setUsername(source.get("username"));
    config.setPassword(source.get("password"));
    config.setDatabase(source.get("database"));
    return config;
  }

  private String quoteIdentifier(DatabaseMetaData metaData, String identifier) throws Exception {
    String quote = metaData.getIdentifierQuoteString().trim();
    if (quote.isEmpty()) {
      return identifier;
    }
    return quote + identifier.replace(quote, quote + quote) + quote;
  }

  private String mongoType(Object value) {
    if (value == null) {
      return "null";
    }
    if (value instanceof Boolean) {
      return "boolean";
    }
    if (value instanceof Integer || value instanceof Long) {
      return "integer";
    }
    if (value instanceof Number) {
      return "number";
    }
    if (value instanceof String) {
      return "string";
    }
    if (value instanceof List<?>) {
      return "array";
    }
    if (value instanceof Map<?, ?>) {
      return "object";
    }
    return value.getClass().getSimpleName();
  }
}
