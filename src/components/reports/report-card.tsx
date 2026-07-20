"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ReportCard({
  title,
  description,
  type,
}: {
  title: string;
  description: string;
  type: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/reports?type=${type}`} download>
            <FileSpreadsheet /> CSV / Excel
          </a>
        </Button>
        <Button variant="outline" size="sm" disabled title="Em breve">
          <FileText /> PDF
        </Button>
      </CardContent>
    </Card>
  );
}
