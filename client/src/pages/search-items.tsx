import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import { ItemCard } from "@/components/item-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Search } from "lucide-react";
import { Link } from "wouter";

export default function SearchItems() {
  const [query, setQuery] = useState("");
  
  const { data: items, isLoading } = useQuery<Item[]>({
    queryKey: [`/api/items?q=${query}`],
    enabled: query.length > 0,
  });

  return (
    <div className="container py-8 max-w-5xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      <div className="flex flex-col items-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Search Lost & Found Items</h1>
        <p className="text-muted-foreground mb-4">
          Search by item name, description or unique ID
        </p>
        
        <div className="w-full max-w-md flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Start typing to search..."
          />
          <Button variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {query && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading && <div>Searching...</div>}
          
          {items?.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
          
          {items?.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No items found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
