import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Package, Building2 } from "lucide-react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Product {
  name: string;
  description: string;
}

interface Entity {
  name: string;
  type: "company" | "team" | "asset";
}

interface ExistsStepProps {
  products: Product[];
  entities: Entity[];
  onProductsChange: (products: Product[]) => void;
  onEntitiesChange: (entities: Entity[]) => void;
  onContinue: () => void;
}

export default function ExistsStep({
  products,
  entities,
  onProductsChange,
  onEntitiesChange,
  onContinue,
}: ExistsStepProps) {
  const [newProduct, setNewProduct] = useState({ name: "", description: "" });
  const [newEntity, setNewEntity] = useState<Entity>({ name: "", type: "company" });

  const addProduct = () => {
    if (newProduct.name.trim()) {
      onProductsChange([...products, { ...newProduct, name: newProduct.name.trim() }]);
      setNewProduct({ name: "", description: "" });
    }
  };

  const removeProduct = (index: number) => {
    onProductsChange(products.filter((_, i) => i !== index));
  };

  const addEntity = () => {
    if (newEntity.name.trim()) {
      onEntitiesChange([...entities, { ...newEntity, name: newEntity.name.trim() }]);
      setNewEntity({ name: "", type: "company" });
    }
  };

  const removeEntity = (index: number) => {
    onEntitiesChange(entities.filter((_, i) => i !== index));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">What exists today?</DialogTitle>
        <DialogDescription>
          Before your team begins, let's establish the facts. What products, services, or entities already exist?
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Products Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Products & Services</Label>
          </div>

          {products.length > 0 && (
            <div className="space-y-2">
              {products.map((product, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-2 p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-1">{product.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeProduct(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Input
              placeholder="Product or service name"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addProduct()}
            />
            <Textarea
              placeholder="Brief description (optional)"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              className="h-16 resize-none"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addProduct}
              disabled={!newProduct.name.trim()}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Entities Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Companies, Teams & Assets</Label>
          </div>

          {entities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entities.map((entity, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 py-1"
                >
                  <span className="text-xs text-muted-foreground">{entity.type}:</span>
                  {entity.name}
                  <button
                    onClick={() => removeEntity(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Entity name"
              value={newEntity.name}
              onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addEntity()}
              className="flex-1"
            />
            <Select
              value={newEntity.type}
              onValueChange={(value: "company" | "team" | "asset") =>
                setNewEntity({ ...newEntity, type: value })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="asset">Asset</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={addEntity}
              disabled={!newEntity.name.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onContinue}>
          Continue
        </Button>
      </div>
    </>
  );
}
