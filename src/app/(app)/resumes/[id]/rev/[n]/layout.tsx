export default function RevisionEditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-8 -my-6 flex h-[calc(100dvh-4.5rem)] min-h-0 flex-col overflow-hidden px-8 py-6">
      {children}
    </div>
  );
}
