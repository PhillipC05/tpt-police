import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, UserCircle, Heart, MapPin, Bell, Users, FileText, Search } from "lucide-react";
import Link from "next/link";

export default function PublicPortalHome() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Community Portal</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Help us keep our community safe. Submit information, file a complaint, commend an officer,
          or connect with your local police precinct — all from one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Submit a Tip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Share information about criminal activity anonymously or with contact details for follow-up.
            </p>
            <Link href="/public/tips">
              <Button className="w-full">Submit a Tip</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-destructive" />
              File a Complaint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              File a complaint regarding officer conduct or police service. Identity recommended for proper follow-up.
            </p>
            <Link href="/public/complaints">
              <Button variant="secondary" className="w-full">File a Complaint</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-green-500" />
              Commend an Officer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Recognize an officer who went above and beyond. Let us know about positive interactions.
            </p>
            <Link href="/public/commendations">
              <Button variant="outline" className="w-full">Commend an Officer</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-500" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              View active AMBER Alerts, BOLOs, and other urgent public safety notices.
            </p>
            <Link href="/public/alerts">
              <Button variant="outline" className="w-full">View Alerts</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Crime Map
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Explore anonymized crime data for your area. See trends and stay informed.
            </p>
            <Link href="/crime-map">
              <Button variant="outline" className="w-full">View Crime Map</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-purple-500" />
              Track Submission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Check the status of a previous submission using your reference number.
            </p>
            <Link href="/public/track">
              <Button variant="outline" className="w-full">Track Status</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-500" />
              FOIA Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Request public records under the Freedom of Information Act.
            </p>
            <Link href="/foia">
              <Button variant="outline" className="w-full">Submit Request</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Community Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Find upcoming police-community events and neighbourhood watch meetings.
            </p>
            <Link href="/public/community/events">
              <Button variant="outline" className="w-full">View Events</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Emergency?</h2>
        <p className="text-muted-foreground">
          If this is an emergency or a crime in progress, <strong>call 111 immediately</strong>.
          Do not use this portal for emergencies.
        </p>
      </div>
    </div>
  );
}