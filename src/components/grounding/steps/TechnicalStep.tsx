import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Database, Globe, Server, ArrowLeft, ArrowRight } from "lucide-react";

export interface TechnicalContext {
  databaseTables: Array<{
    name: string;
    description: string;
    keyColumns?: string;
  }>;
  apiEndpoints: Array<{
    method: string;
    path: string;
    description: string;
  }>;
  techStack: Array<{
    category: "frontend" | "backend" | "database" | "infrastructure" | "other";
    name: string;
    version?: string;
  }>;
  externalServices: Array<{
    name: string;
    purpose: string;
  }>;
}

interface TechnicalStepProps {
  data: TechnicalContext;
  onChange: (data: TechnicalContext) => void;
  onContinue: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

const categoryLabels: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
  infrastructure: "Infrastructure",
  other: "Other",
};

export default function TechnicalStep({
  data,
  onChange,
  onContinue,
  onBack,
  isLoading,
}: TechnicalStepProps) {
  const [newTable, setNewTable] = useState({ name: "", description: "", keyColumns: "" });
  const [newEndpoint, setNewEndpoint] = useState({ method: "GET", path: "", description: "" });
  const [newTech, setNewTech] = useState({ category: "frontend" as const, name: "", version: "" });
  const [newService, setNewService] = useState({ name: "", purpose: "" });

  const addTable = () => {
    if (!newTable.name.trim()) return;
    onChange({
      ...data,
      databaseTables: [...data.databaseTables, { ...newTable }],
    });
    setNewTable({ name: "", description: "", keyColumns: "" });
  };

  const removeTable = (index: number) => {
    onChange({
      ...data,
      databaseTables: data.databaseTables.filter((_, i) => i !== index),
    });
  };

  const addEndpoint = () => {
    if (!newEndpoint.path.trim()) return;
    onChange({
      ...data,
      apiEndpoints: [...data.apiEndpoints, { ...newEndpoint }],
    });
    setNewEndpoint({ method: "GET", path: "", description: "" });
  };

  const removeEndpoint = (index: number) => {
    onChange({
      ...data,
      apiEndpoints: data.apiEndpoints.filter((_, i) => i !== index),
    });
  };

  const addTech = () => {
    if (!newTech.name.trim()) return;
    onChange({
      ...data,
      techStack: [...data.techStack, { ...newTech }],
    });
    setNewTech({ category: "frontend", name: "", version: "" });
  };

  const removeTech = (index: number) => {
    onChange({
      ...data,
      techStack: data.techStack.filter((_, i) => i !== index),
    });
  };

  const addService = () => {
    if (!newService.name.trim()) return;
    onChange({
      ...data,
      externalServices: [...data.externalServices, { ...newService }],
    });
    setNewService({ name: "", purpose: "" });
  };

  const removeService = (index: number) => {
    onChange({
      ...data,
      externalServices: data.externalServices.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Technical Architecture</h2>
        <p className="text-muted-foreground mt-1">
          Document your technical stack so AI roles can make informed proposals
        </p>
      </div>

      {/* Database Tables */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <Label className="font-medium">Database Tables</Label>
          </div>

          {data.databaseTables.map((table, index) => (
            <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded-md">
              <div className="flex-1">
                <p className="font-mono text-sm">{table.name}</p>
                <p className="text-xs text-muted-foreground">{table.description}</p>
                {table.keyColumns && (
                  <p className="text-xs text-muted-foreground">Keys: {table.keyColumns}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeTable(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="grid gap-2">
            <Input
              placeholder="Table name (e.g., users, orders)"
              value={newTable.name}
              onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={newTable.description}
              onChange={(e) => setNewTable({ ...newTable, description: e.target.value })}
            />
            <Input
              placeholder="Key columns (optional, e.g., id, user_id)"
              value={newTable.keyColumns}
              onChange={(e) => setNewTable({ ...newTable, keyColumns: e.target.value })}
            />
            <Button variant="outline" size="sm" onClick={addTable} disabled={!newTable.name.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add Table
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Label className="font-medium">API Endpoints</Label>
          </div>

          {data.apiEndpoints.map((endpoint, index) => (
            <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded-md">
              <div className="flex-1">
                <p className="font-mono text-sm">
                  <Badge variant="outline" className="mr-2">{endpoint.method}</Badge>
                  {endpoint.path}
                </p>
                <p className="text-xs text-muted-foreground">{endpoint.description}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeEndpoint(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="grid gap-2">
            <div className="flex gap-2">
              <Select
                value={newEndpoint.method}
                onValueChange={(value) => setNewEndpoint({ ...newEndpoint, method: value })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="/api/endpoint"
                value={newEndpoint.path}
                onChange={(e) => setNewEndpoint({ ...newEndpoint, path: e.target.value })}
                className="flex-1"
              />
            </div>
            <Input
              placeholder="Description"
              value={newEndpoint.description}
              onChange={(e) => setNewEndpoint({ ...newEndpoint, description: e.target.value })}
            />
            <Button variant="outline" size="sm" onClick={addEndpoint} disabled={!newEndpoint.path.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add Endpoint
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <Label className="font-medium">Tech Stack</Label>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.techStack.map((tech, index) => (
              <Badge key={index} variant="secondary" className="gap-1 pr-1">
                <span className="text-xs text-muted-foreground">{categoryLabels[tech.category]}:</span>
                {tech.name}
                {tech.version && <span className="text-muted-foreground">@{tech.version}</span>}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 ml-1" 
                  onClick={() => removeTech(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>

          <div className="grid gap-2">
            <div className="flex gap-2">
              <Select
                value={newTech.category}
                onValueChange={(value: any) => setNewTech({ ...newTech, category: value })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frontend">Frontend</SelectItem>
                  <SelectItem value="backend">Backend</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Technology name"
                value={newTech.name}
                onChange={(e) => setNewTech({ ...newTech, name: e.target.value })}
                className="flex-1"
              />
              <Input
                placeholder="Version"
                value={newTech.version}
                onChange={(e) => setNewTech({ ...newTech, version: e.target.value })}
                className="w-24"
              />
            </div>
            <Button variant="outline" size="sm" onClick={addTech} disabled={!newTech.name.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add Technology
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* External Services */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Label className="font-medium">External Services & Integrations</Label>

          {data.externalServices.map((service, index) => (
            <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded-md">
              <div className="flex-1">
                <p className="text-sm font-medium">{service.name}</p>
                <p className="text-xs text-muted-foreground">{service.purpose}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeService(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="grid gap-2">
            <Input
              placeholder="Service name (e.g., Stripe, AWS S3)"
              value={newService.name}
              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
            />
            <Input
              placeholder="Purpose (e.g., Payment processing)"
              value={newService.purpose}
              onChange={(e) => setNewService({ ...newService, purpose: e.target.value })}
            />
            <Button variant="outline" size="sm" onClick={addService} disabled={!newService.name.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add Service
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        This step is optional. You can skip it if your company doesn't have a software product.
      </p>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onContinue} disabled={isLoading}>
          {isLoading ? "Generating..." : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
