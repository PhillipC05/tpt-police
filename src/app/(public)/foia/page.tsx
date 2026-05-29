import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Search } from "lucide-react";
import Link from "next/link";

export default function FoiaPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">FOIA / Records Request</h1>
        <p className="text-muted-foreground">
          Submit a public records request under the Freedom of Information Act.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New Request</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Submit a request for police records, incident reports, or other public documents.
            </p>
            <Link href="/foia/new">
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Submit Request
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Track Request</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Check the status of an existing request using your reference number.
            </p>
            <Link href="/foia/track">
              <Button variant="outline">
                <Search className="w-4 h-4 mr-2" />
                Track Status
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}