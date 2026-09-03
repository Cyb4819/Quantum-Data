"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import useChatStore from "@/app/hooks/useChatStore";
import { Input } from "@/components/ui/input";

export function AddDatabaseDialog() {
  const [open, setOpen] = useState(false);
  const { setSelectedDatabase, selectedDatabase } = useChatStore();
  const [connectionMessage, setConnectionMessage] = useState("");
  const [selectedDBType, setSelectedDBType] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    host: "localhost",
    port: "3306",
    user: "root",
    password: "vansh4542",
    database: "customers",
  });
  const [isConnecting, setIsConnecting] = useState(false);

  const onOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedDBType(null);
      setConnectionMessage("");
      setFormData({
        host: "localhost",
        port: "3306",
        user: "root",
        password: "vansh4542",
        database: "customers",
      });
    }
  };

  const handleDatabaseSelect = (dbType: string) => {
    setSelectedDBType(dbType);
    setConnectionMessage("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConnect = async () => {
    if (
      !selectedDBType ||
      !formData.host ||
      !formData.port ||
      !formData.user ||
      !formData.database
    ) {
      setConnectionMessage("❌ Please fill in all required fields");
      return;
    }

    setIsConnecting(true);
    setConnectionMessage("🔄 Testing connection...");

    // This matches DBConnectionConfig exactly
    const config = {
      type: selectedDBType,
      url: `jdbc:mysql://${formData.host}:${formData.port}/${formData.database}`,
      username: formData.user,
      password: formData.password,
    };

    try {
      const response = await fetch("http://localhost:8081/api/db/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to connect to database");
      }

      // Keep the UI/store representation separate from the backend DTO
      const selectedConfig = {
        dbType: selectedDBType,
        host: formData.host,
        port: parseInt(formData.port, 10),
        user: formData.user,
        password: formData.password,
        database: formData.database,
      };

      setSelectedDatabase(selectedConfig);

      document.cookie = `selectedDatabase=${encodeURIComponent(
        JSON.stringify(selectedConfig),
      )}; path=/; max-age=86400`;

      setConnectionMessage(
        `✅ Connected to ${selectedDBType}@${formData.host}:${formData.port}/${formData.database}`,
      );

      setTimeout(() => {
        setOpen(false);
        setSelectedDBType(null);
        setConnectionMessage("");
        setIsConnecting(false);
      }, 2000);
    } catch (err) {
      setConnectionMessage(
        `❌ Connection failed: ${
          err instanceof Error ? err.message : "Unable to connect to database"
        }`,
      );

      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 
        The button that triggers the dialog.
        You can reuse this entire component in multiple places.
      */}
      <DialogTrigger asChild>
        <Button className="rounded-full gap-2 flex text-xs" variant={"outline"}>
          Add Database
        </Button>
      </DialogTrigger>

      {/* The dialog content */}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Connect a Database</DialogTitle>
          <DialogDescription>
            Choose a database provider to integrate with your application.
          </DialogDescription>
        </DialogHeader>

        {/* Main content area, styled as a 2-column layout */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Left column: icons and database names */}
          <div className="md:w-1/2 border-r pr-4 space-y-2">
            {/* Postgres */}
            <Button
              variant={selectedDBType === "postgres" ? "default" : "ghost"}
              className="w-full justify-start py-4"
              onClick={() => handleDatabaseSelect("postgres")}
            >
              <Image
                src="/postgres.svg"
                alt="Postgres"
                width={30}
                height={30}
                className="mr-2"
              />
              Postgres
              {selectedDatabase?.dbType === "postgres" && (
                <span className="text-xs ml-auto text-green-400">
                  ✓ Connected
                </span>
              )}
            </Button>

            {/* Redis */}
            <Button
              variant={selectedDBType === "redis" ? "default" : "ghost"}
              className="w-full justify-start py-4"
              onClick={() => handleDatabaseSelect("redis")}
            >
              <Image
                src="/redis.svg"
                alt="Redis"
                width={30}
                height={30}
                className="mr-2"
              />
              Redis
              {selectedDatabase?.dbType === "redis" && (
                <span className="text-xs ml-auto text-green-400">
                  ✓ Connected
                </span>
              )}
            </Button>

            {/* Mysql */}
            <Button
              variant={selectedDBType === "mysql" ? "default" : "ghost"}
              className="w-full justify-start py-4"
              onClick={() => handleDatabaseSelect("mysql")}
            >
              <Image
                src="/mysql.svg"
                alt="MySQL"
                width={30}
                height={30}
                className="mr-2"
              />
              MySQL
              {selectedDatabase?.dbType === "mysql" && (
                <span className="text-xs ml-auto text-green-400">
                  ✓ Connected
                </span>
              )}
            </Button>

            {/* Firebase */}
            <Button
              variant={selectedDBType === "firebase" ? "default" : "ghost"}
              className="w-full justify-start py-4"
              onClick={() => handleDatabaseSelect("firebase")}
            >
              <Image
                src="/firebase.svg"
                alt="Firebase"
                width={30}
                height={30}
                className="mr-2"
              />
              Firebase
              {selectedDatabase?.dbType === "firebase" && (
                <span className="text-xs ml-auto text-green-400">
                  ✓ Connected
                </span>
              )}
            </Button>

            {/* Mongo */}
            <Button
              variant={selectedDBType === "mongo" ? "default" : "ghost"}
              className="w-full justify-start py-4"
              onClick={() => handleDatabaseSelect("mongo")}
            >
              <Image
                src="/mongo.svg"
                alt="Mongo"
                width={30}
                height={30}
                className="mr-2"
              />
              Mongo
              {selectedDatabase?.dbType === "mongo" && (
                <span className="text-xs ml-auto text-green-400">
                  ✓ Connected
                </span>
              )}
            </Button>

            {/* elastic */}
            <Button
              variant={selectedDBType === "elasticsearch" ? "default" : "ghost"}
              className="w-full justify-start py-4"
              onClick={() => handleDatabaseSelect("elasticsearch")}
            >
              <Image
                src="/elastic.svg"
                alt="ElasticSearch"
                width={30}
                height={30}
                className="mr-2"
              />
              Elastic Search
              {selectedDatabase?.dbType === "elasticsearch" && (
                <span className="text-xs ml-auto text-green-400">
                  ✓ Connected
                </span>
              )}
            </Button>

            {/* Custom */}
            <Button
              variant={selectedDBType === "custom" ? "default" : "ghost"}
              className="w-full justify-start py-4"
              onClick={() => handleDatabaseSelect("custom")}
            >
              <Image
                src="/custom.svg"
                alt="My DB"
                width={30}
                height={30}
                className="mr-2"
              />
              My Custom DB
              {selectedDatabase?.dbType === "custom" && (
                <span className="text-xs ml-auto text-green-400">
                  ✓ Connected
                </span>
              )}
            </Button>
          </div>

          {/* Right column: explanation or form */}
          <div className="md:w-1/2 gap-2 p-4 flex flex-col justify-center">
            {connectionMessage ? (
              <div
                className={`border rounded p-3 ${connectionMessage.includes("❌") || connectionMessage.includes("error") ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}
              >
                <p
                  className={`text-sm font-semibold ${connectionMessage.includes("❌") || connectionMessage.includes("error") ? "text-red-700" : "text-green-700"}`}
                >
                  {connectionMessage}
                </p>
              </div>
            ) : !selectedDBType ? (
              <>
                <h2 className="text-sm font-bold">What is a Database?</h2>
                <p className="text-sm text-muted-foreground">
                  A database is a service that stores and organizes your data.
                  Choose the provider that best suits your application’s needs.
                </p>
                <p className="text-sm text-muted-foreground">
                  Once connected, you can manage data directly through our
                  interface.
                </p>
                <Button className="rounded-full mt-6 self-center text-xs">
                  Get a Database
                </Button>
              </>
            ) : selectedDBType === "mysql" ? (
              <>
                <h2 className="text-sm font-bold">MySQL Connection</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold">Host</label>
                    <Input
                      name="host"
                      value={formData.host}
                      onChange={handleInputChange}
                      placeholder="localhost"
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">Port</label>
                    <Input
                      name="port"
                      value={formData.port}
                      onChange={handleInputChange}
                      placeholder="3306"
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">User</label>
                    <Input
                      name="user"
                      value={formData.user}
                      onChange={handleInputChange}
                      placeholder="root"
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">Password</label>
                    <Input
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="password"
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">Database</label>
                    <Input
                      name="database"
                      value={formData.database}
                      onChange={handleInputChange}
                      placeholder="bikestore"
                      className="text-xs mt-1"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-sm font-bold">
                  {selectedDBType} - Coming Soon
                </h2>
                <p className="text-sm text-muted-foreground">
                  Support for {selectedDBType} is coming soon. For now, only
                  MySQL is fully supported.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Optional footer for actions (e.g., a "Close" or "Confirm" button) */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {selectedDBType === "mysql" && (
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? "Testing..." : "Connect Database"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
