import { AccessDesigner } from "@/components/access/access-designer";

type AccessPageProps = {
  params: {
    projectId: string;
    folderId: string;
  };
};

export default function AccessPage({ params }: AccessPageProps) {
  return (
    <main className="route-shell">
      <h1>Access Designer</h1>
      <AccessDesigner projectId={params.projectId} folderId={params.folderId} />
    </main>
  );
}
