"use client";

import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  PaginationModule,
} from "ag-grid-community";

ModuleRegistry.registerModules([ClientSideRowModelModule, PaginationModule]);

interface QueryResultTableProps {
  results: Record<string, unknown>[];
}

export default function QueryResultTable({ results }: QueryResultTableProps) {
  if (!results || results.length === 0) {
    return null;
  }

  const columns: ColDef[] = Object.keys(results[0]).map((key) => ({
    field: key,
    headerName: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    sortable: true,
    filter: true,
    resizable: true,
  }));

  return (
    <div>
      <AgGridReact
        rowData={results}
        columnDefs={columns}
        domLayout="autoHeight"
        pagination={true}
        paginationPageSize={10}
        animateRows={true}
      />
    </div>
  );
}
