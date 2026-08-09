import Link from "next/link";
export const metadata = { title: "About — McKinney SDA Church" };
export default function About() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">About Us</h1>
      <p>McKinney Seventh-day Adventist Church is a community of faith in McKinney, Texas. We gather each Sabbath (Saturday) to worship, study Scripture, and serve our neighbors.</p>
      <p>To learn what we believe, see our <Link href="/beliefs" className="underline">28 Fundamental Beliefs</Link>. New here? <Link href="/plan-a-visit" className="underline">Plan your visit</Link>.</p>
    </div>
  );
}
