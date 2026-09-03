package com.hackfest_2.data_dictionary_agent.service;

import java.io.*;
import java.sql.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class MetadataService {
  public List<Map<String, Object>> extractFromMultipleSources(List<Map<String, String>> sources) {
    List<Map<String, Object>> allSourcesData = new ArrayList<>();

    for (Map<String, String> source : sources) {
      try {
        String type = source.get("type");
        String name = source.getOrDefault("name", "Unknown");

        Map<String, Object> sourceData;

        switch (type.toLowerCase()) {
          case "mysql":
            sourceData = extractFromJdbcSource(source);
            break;
          default:
            sourceData = createErrorSource(source);
            break;
        }

        if (sourceData.containsKey("tablesList")) {
          ((Map) sourceData).put("sourceName", name);
        }
        allSourcesData.add(sourceData);

      } catch (Exception e) {
        e.printStackTrace();
        allSourcesData.add(createErrorSource(source));
      }
    }
    return allSourcesData;
  }

  private Map<String, Object> extractFromJdbcSource(Map<String, String> source) throws Exception {
    String url = source.get("url");
    String username = source.get("username");
    String password = source.get("password");
    String driverClassName = source.get("driverClassName");

    Class.forName(driverClassName);

    List<Map<String, Object>> tablesList = new ArrayList<>();

    try (Connection connection = DriverManager.getConnection(url, username, password)) {

      String databaseName = connection.getCatalog();
      DatabaseMetaData metaData = connection.getMetaData();
      ResultSet tables = metaData.getTables(databaseName, null, "%", new String[] {"TABLE"});
      while (tables.next()) {
        String tableName = tables.getString("TABLE_NAME");

        Map<String, Object> tableData = new HashMap<>();
        tableData.put("tableName", tableName);
        tableData.put("tableType", tables.getString("TABLE_TYPE"));

        try (Statement statement = connection.createStatement();
            ResultSet rowCount = statement.executeQuery("select count(*) from " + tableName)) {
          rowCount.next();
          tableData.put("rowCount", rowCount.getLong(1));
        }

        ResultSet indexInfo = metaData.getIndexInfo(null, null, tableName, true, false);
        HashSet<String> uniqueColumnNames = new HashSet<>();
        while (indexInfo.next()) {
          String column = indexInfo.getString("COLUMN_NAME");
          if (column != null) uniqueColumnNames.add(column);
        }
        indexInfo.close();

        ResultSet columns = metaData.getColumns(null, null, tableName, null);
        List<Map<String, Object>> columnList = new ArrayList<>();
        while (columns.next()) {
          Map<String, Object> columnData = new HashMap<>();
          String columnName = columns.getString("COLUMN_NAME");
          columnData.put("columnName", columnName);
          columnData.put("dataType", columns.getString("TYPE_NAME"));
          columnData.put("size", columns.getInt("COLUMN_SIZE"));
          columnData.put("nullable", columns.getInt("NULLABLE") == DatabaseMetaData.columnNullable);
          columnData.put("defaultValue", columns.getString("COLUMN_DEF"));
          columnData.put("autoIncrement", columns.getString("IS_AUTOINCREMENT"));
          columnData.put("ordinalPosition", columns.getShort("ORDINAL_POSITION"));
          columnData.put("isUnique", uniqueColumnNames.contains(columnName));
          columnList.add(columnData);
        }

        tableData.put("columns", columnList);

        ResultSet pk = metaData.getPrimaryKeys(null, null, tableName);
        List<String> primaryKeys = new ArrayList<>();
        while (pk.next()) {
          primaryKeys.add(pk.getString("COLUMN_NAME"));
        }
        tableData.put("primaryKeys", primaryKeys);

        ResultSet fk = metaData.getImportedKeys(null, null, tableName);
        List<Map<String, String>> foreignKeys = new ArrayList<>();
        while (fk.next()) {
          Map<String, String> fkData = new HashMap<>();
          fkData.put("fkColumn", fk.getString("FKCOLUMN_NAME"));
          fkData.put("pkTable", fk.getString("PKTABLE_NAME"));
          fkData.put("pkColumn", fk.getString("PKCOLUMN_NAME"));
          foreignKeys.add(fkData);
        }
        tableData.put("foreignKeys", foreignKeys);

        tablesList.add(tableData);
      }
    }

    Map<String, Object> sourceData = new HashMap<>();
    sourceData.put("connectionUrl", url);
    sourceData.put("userName", username);
    sourceData.put("password", password);
    sourceData.put("driverClassName", driverClassName);
    sourceData.put("tablesList", tablesList);
    return sourceData;
  }

  private Map<String, Object> createErrorSource(Map<String, String> source) {
    Map<String, Object> errorData = new HashMap<>();
    errorData.put("connectionUrl", source.get("url"));
    errorData.put("userName", source.get("username"));
    errorData.put("password", "error");
    errorData.put("driverClassName", source.get("type"));
    errorData.put("tablesList", new ArrayList<>());
    return errorData;
  }
}
