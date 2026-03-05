import { ShareViewer } from "@/components/share/share-viewer";

type SharePageProps = {
  params: {
    token: string;
  };
};

export default function SharePage({ params }: SharePageProps) {
  return (
    <main className="route-shell">
      <h1>Shared Record</h1>
      <ShareViewer token={params.token} />
    </main>
  );
}
