import { useQuery } from "@tanstack/react-query";
import { uid } from "../../src/lib/supabase";
import { Profile } from "../../src/Profile";
import { State } from "../../src/ui";
export default function Own() {
  const q = useQuery({ queryKey: ["me"], queryFn: uid });
  return q.data ? (
    <Profile id={q.data} own />
  ) : (
    <State loading={q.isPending} error={q.error} />
  );
}
