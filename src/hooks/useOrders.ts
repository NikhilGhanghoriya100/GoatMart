import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import type { Order } from "@/types";

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    axios
      .get("/api/orders")
      .then(({ data }) => {
        if (data.success) setOrders(data.data);
      })
      .catch(() => setError("Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders, setOrders };
}
