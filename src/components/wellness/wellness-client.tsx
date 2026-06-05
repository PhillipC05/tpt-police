"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Heart, Brain, Smile, Frown, Plus } from "lucide-react";
import { toast } from "sonner";

interface Checkin {
  id: string;
  moodScore: number;
  note: string | null;
  flagged: boolean;
  checkinDate: string;
  officer: { id: string; name: string; badgeNumber: string | null; department: string | null };
}

interface Counselling {
  id: string;
  provider: string;
  sessionDate: string;
  notes: string | null;
  attended: boolean;
  officer: { id: string; name: string; badgeNumber: string | null };
}

export function WellnessClient({ userRole }: { userRole: string }) {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [counselling, setCounselling] = useState<Counselling[]>([]);
  const [tab, setTab] = useState<"checkin" | "counselling" | "trends">("checkin");
  const [openCheckin, setOpenCheckin] = useState(false);
  const [openCounselling, setOpenCounselling] = useState(false);
  const [moodScore, setMoodScore] = useState("3");
  const [note, setNote] = useState("");
  const [cForm, setCForm] = useState({ officerId: "", provider: "", sessionDate: "", notes: "" });
  const [trends, setTrends] = useState<any>(null);

  const isAdmin = ["PRECINCT_ADMIN", "CITY_ADMIN", "SUPER_ADMIN"].includes(userRole);

  const fetchData = useCallback(async () => {
    try {
      const [checkinRes, counsellingRes] = await Promise.all([
        fetch("/api/wellness"),
        fetch("/api/wellness/counselling"),
      ]);
      if (checkinRes.ok) setCheckins(await checkinRes.json());
      if (counsellingRes.ok) setCounselling(await counsellingRes.json());
    } catch {
      toast.error("Failed to load wellness data");
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (tab === "trends") {
      fetch("/api/wellness/trends")
        .then((r) => r.ok && r.json())
        .then((d) => setTrends(d))
        .catch(() => {});
    }
  }, [tab]);

  const handleCheckin = async () => {
    try {
      const res = await fetch("/api/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moodScore: parseInt(moodScore), note: note || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Check-in recorded");
      setOpenCheckin(false);
      setMoodScore("3");
      setNote("");
      fetchData();
    } catch {
      toast.error("Failed to submit check-in");
    }
  };

  const handleCounsellingCreate = async () => {
    if (!cForm.officerId || !cForm.provider || !cForm.sessionDate) {
      toast.error("All fields required");
      return;
    }
    try {
      const res = await fetch("/api/wellness/counselling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cForm, sessionDate: new Date(cForm.sessionDate).toISOString() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Counselling session scheduled");
      setOpenCounselling(false);
      setCForm({ officerId: "", provider: "", sessionDate: "", notes: "" });
      fetchData();
    } catch {
      toast.error("Failed to schedule session");
    }
  };

  const moodEmoji = (score: number) => {
    if (score <= 2) return <Frown className="w-4 h-4 text-yellow-500" />;
    if (score === 3) return <Smile className="w-4 h-4 text-blue-500" />;
    return <Heart className="w-4 h-4 text-green-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant={tab === "checkin" ? "default" : "outline"} onClick={() => setTab("checkin")}>Check-ins</Button>
        <Button variant={tab === "counselling" ? "default" : "outline"} onClick={() => setTab("counselling")}>Counselling</Button>
        <Button variant={tab === "trends" ? "default" : "outline"} onClick={() => setTab("trends")}>Trends</Button>
      </div>

      <Dialog open={openCheckin} onOpenChange={setOpenCheckin}>
        <DialogTrigger render={<Button><Plus className="w-4 h-4 mr-2" />Check In</Button>} />
        <DialogContent>
          <DialogHeader><DialogTitle>Wellness Check-in</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Mood Score (1-5)</Label>
              <Select value={moodScore} onValueChange={setMoodScore}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} — {["Very Low", "Low", "Okay", "Good", "Great"][n - 1]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="How are you feeling today?" />
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button onClick={handleCheckin}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {tab === "checkin" && (
        <div className="space-y-3">
          {checkins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No check-ins recorded</div>
          ) : (
            checkins.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  {moodEmoji(c.moodScore)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.officer.name}</span>
                      <Badge variant="secondary">{c.moodScore}/5</Badge>
                      {c.flagged && <Badge variant="destructive">Flagged</Badge>}
                    </div>
                    {c.note && <p className="text-sm mt-1">{c.note}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(c.checkinDate).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "counselling" && (
        <div className="space-y-3">
          {isAdmin && (
            <Dialog open={openCounselling} onOpenChange={setOpenCounselling}>
              <DialogTrigger render={<Button variant="outline"><Plus className="w-4 h-4 mr-2" />Schedule Session</Button>} />
              <DialogContent>
                <DialogHeader><DialogTitle>Schedule Counselling</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label>Officer ID</Label>
                    <Input value={cForm.officerId} onChange={(e) => setCForm((f) => ({ ...f, officerId: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Provider</Label>
                    <Input value={cForm.provider} onChange={(e) => setCForm((f) => ({ ...f, provider: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Session Date</Label>
                    <Input type="datetime-local" value={cForm.sessionDate} onChange={(e) => setCForm((f) => ({ ...f, sessionDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <Textarea value={cForm.notes} onChange={(e) => setCForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                    <Button onClick={handleCounsellingCreate}>Schedule</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {counselling.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No counselling sessions</div>
          ) : (
            counselling.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <Brain className="w-4 h-4 mt-1 text-blue-500 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.officer.name}</span>
                      <Badge variant={s.attended ? "default" : "secondary"}>{s.attended ? "Attended" : "Scheduled"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Provider: {s.provider}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.sessionDate).toLocaleString()}</p>
                    {s.notes && <p className="text-sm mt-1">{s.notes}</p>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "trends" && trends && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Department Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Total Check-ins</p>
                  <p className="text-2xl font-bold">{trends.trends.totalCheckins}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Mood</p>
                  <p className="text-2xl font-bold">{trends.trends.averageMood}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Flagged for Follow-up</p>
                  <p className="text-2xl font-bold text-yellow-500">{trends.trends.flaggedForFollowUp}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Mood Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="text-center">
                    <p className="text-xs text-muted-foreground">{i}</p>
                    <p className="text-lg font-bold">{(trends.trends.byScore[String(i)] || 0)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {Object.keys(trends.trends.byDepartment).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">By Department</CardTitle></CardHeader>
              <CardContent className="grid gap-2">
                {Object.entries(trends.trends.byDepartment as Record<string, { count: number; avgMood: number }>).map(([dept, data]) => (
                  <div key={dept} className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium">{dept}</span>
                    <span className="text-sm text-muted-foreground">{data.count} check-ins · Avg {data.avgMood}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}