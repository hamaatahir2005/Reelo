import { useLocalSearchParams } from "expo-router";
import { Profile } from "../../src/Profile";
export default function User() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Profile id={id} />;
}
