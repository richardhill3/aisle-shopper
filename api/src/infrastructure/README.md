# Infrastructure

Adapters for external systems live here, such as Postgres, Supabase, and other
process or network boundaries. Infrastructure may depend on application ports
and domain types, but domain and application code must not depend on this layer.
