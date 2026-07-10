"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Users, CalendarCheck, Send, Handshake, Target } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { currency, dateFormat, percent } from "@/lib/format";
import { meetingAlert, expectedRevenue, meetingFunnel, channelPerformance, weightedPipelineRevenue } from "@/lib/calculations";
import { Meeting, MeetingStatus, MeetingChannel, MeetingType } from "@/lib/types";
import { useSortable } from "@/hooks/use-sortable";
import { SortableHeader } from "@/components/sortable-header";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const COLORS = {
  cyan: "oklch(0.75 0.15 195)",
  blue: "oklch(0.65 0.15 250)",
  emerald: "oklch(0.7 0.17 155)",
  amber: "oklch(0.8 0.15 75)",
  rose: "oklch(0.65 0.2 15)",
  purple: "oklch(0.65 0.2 300)",
  muted: "oklch(0.28 0.01 260)",
  text: "oklch(0.65 0.01 260)",
  bg: "oklch(0.18 0.005 260)",
  border: "oklch(0.28 0.01 260)",
};

const FUNNEL_COLORS = [COLORS.blue, COLORS.cyan, COLORS.purple, COLORS.emerald];

const statusColors: Record<MeetingStatus, string> = {
  Agendada: "bg-orbi-blue/20 text-orbi-blue",
  Realizada: "bg-orbi-cyan/20 text-orbi-cyan",
  Remarcar: "bg-orbi-amber/20 text-orbi-amber",
  "Proposta enviada": "bg-purple-500/20 text-purple-400",
  Fechada: "bg-orbi-emerald/20 text-orbi-emerald",
  Perdida: "bg-orbi-rose/20 text-orbi-rose",
};

const alertColors: Record<string, string> = {
  "Retorno vencido": "bg-orbi-rose/20 text-orbi-rose",
  "Retorno proximo": "bg-orbi-amber/20 text-orbi-amber",
  "Em dia": "bg-orbi-emerald/20 text-orbi-emerald",
  Fechada: "bg-orbi-emerald/20 text-orbi-emerald",
  Perdida: "bg-muted text-muted-foreground",
  "Sem retorno": "bg-muted text-muted-foreground",
};

type FormData = Omit<Meeting, "id" | "createdAt">;

const emptyForm: FormData = {
  date: new Date().toISOString().split("T")[0],
  clientLead: "",
  responsible: "",
  channel: "WhatsApp",
  type: "Primeiro contato",
  status: "Agendada",
  expectedMRR: 0,
  probability: 0.5,
  nextReturnDate: "",
  notes: "",
};

type MeetingRow = Meeting & { expectedRevenue: number; alert: string };

export default function MeetingsPage() {
  const { data, loaded, addMeeting, updateMeeting, deleteMeeting } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  const filtered = loaded
    ? data.meetings.filter((m) => statusFilter === "Todos" || m.status === statusFilter)
    : [];

  const enriched: MeetingRow[] = filtered.map((m) => ({
    ...m,
    expectedRevenue: m.expectedMRR * m.probability,
    alert: meetingAlert(m),
  }));

  const { sorted: meetings, sortKey, sortDir, toggleSort } = useSortable<MeetingRow>(enriched);

  if (!loaded) return null;

  const totalRevenue = expectedRevenue(data.meetings);
  const totalMeetings = data.meetings.length;
  const closedCount = data.meetings.filter((m) => m.status === "Fechada").length;
  const proposalCount = data.meetings.filter((m) => m.status === "Proposta enviada").length;
  const pipeline = weightedPipelineRevenue(data.meetings);

  // Insights
  const funnel = meetingFunnel(data.meetings);
  const channels = channelPerformance(data.meetings);
  const lostCount = data.meetings.filter((m) => m.status === "Perdida").length;
  const closeRate = totalMeetings > 0 ? closedCount / totalMeetings : 0;

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(m: Meeting) {
    setEditingId(m.id);
    setForm({
      date: m.date,
      clientLead: m.clientLead,
      responsible: m.responsible,
      channel: m.channel,
      type: m.type,
      status: m.status,
      expectedMRR: m.expectedMRR,
      probability: m.probability,
      nextReturnDate: m.nextReturnDate || "",
      notes: m.notes || "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.clientLead) return;
    if (editingId) {
      updateMeeting(editingId, form);
    } else {
      addMeeting(form);
    }
    setDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reunioes</h2>
          <p className="text-muted-foreground">Controle reunioes, propostas e pipeline de vendas</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Reuniao
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-orbi-cyan" />
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <p className="text-2xl font-bold">{totalMeetings}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Send className="h-4 w-4 text-purple-400" />
              <p className="text-sm text-muted-foreground">Propostas</p>
            </div>
            <p className="text-2xl font-bold">{proposalCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Handshake className="h-4 w-4 text-orbi-emerald" />
              <p className="text-sm text-muted-foreground">Fechadas</p>
            </div>
            <p className="text-2xl font-bold">{closedCount}</p>
            <p className="text-xs text-muted-foreground">Taxa: {percent(closeRate, 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-purple-400" />
              <p className="text-sm text-muted-foreground">Pipeline Ponderado</p>
            </div>
            <p className="text-2xl font-bold">{currency(pipeline.weighted)}</p>
            <p className="text-xs text-muted-foreground">{pipeline.dealCount} deals abertos</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck className="h-4 w-4 text-orbi-amber" />
              <p className="text-sm text-muted-foreground">Receita Esperada</p>
            </div>
            <p className="text-2xl font-bold">{currency(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales funnel */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funil de Vendas</CardTitle>
            <CardDescription>Conversao: Agendada → Realizada → Proposta → Fechada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnel.map((step, i) => {
                const maxCount = Math.max(...funnel.map((f) => f.count), 1);
                const widthPct = Math.max((step.count / maxCount) * 100, 8);
                return (
                  <div key={step.status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{step.status}</span>
                      <span className="text-muted-foreground">{step.count} ({currency(step.revenue)})</span>
                    </div>
                    <div className="h-8 rounded-md overflow-hidden bg-muted">
                      <div
                        className="h-full rounded-md flex items-center px-3 transition-all"
                        style={{ width: `${widthPct}%`, background: FUNNEL_COLORS[i] }}
                      >
                        <span className="text-xs font-bold text-white">{step.count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {lostCount > 0 && (
                <div className="pt-1 text-xs text-orbi-rose">
                  {lostCount} perdida(s) — nao entram no funil
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Channel performance */}
        {channels.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance por Canal</CardTitle>
              <CardDescription>MRR esperado e taxa de fechamento por canal de origem</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channels} margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.muted} />
                    <XAxis dataKey="channel" stroke={COLORS.text} fontSize={11} />
                    <YAxis stroke={COLORS.text} fontSize={11} tickFormatter={(v: number) => `${v}`} />
                    <Tooltip
                      contentStyle={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: "8px" }}
                      formatter={(value, name) => [
                        name === "total" ? `${Number(value)} reunioes` : `${Number(value)} fechadas`,
                        name === "total" ? "Total" : "Fechadas"
                      ]}
                    />
                    <Bar dataKey="total" fill={COLORS.blue} radius={[4, 4, 0, 0]} name="total" />
                    <Bar dataKey="closed" fill={COLORS.emerald} radius={[4, 4, 0, 0]} name="closed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {channels.map((ch) => (
                  <div key={ch.channel} className="text-xs text-muted-foreground flex justify-between px-2">
                    <span>{ch.channel}</span>
                    <span className={ch.closeRate > 0 ? "text-orbi-emerald" : ""}>
                      {percent(ch.closeRate, 0)} conv.
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {["Todos", "Agendada", "Realizada", "Remarcar", "Proposta enviada", "Fechada", "Perdida"].map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
            {s}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhuma reuniao encontrada</h3>
              <Button onClick={openNew} className="mt-4 gap-2"><Plus className="h-4 w-4" />Nova Reuniao</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr className="border-b">
                    <SortableHeader label="Data" sortKey={"date" as keyof MeetingRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableHeader label="Cliente/Lead" sortKey={"clientLead" as keyof MeetingRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableHeader label="Canal" sortKey={"channel" as keyof MeetingRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableHeader label="Status" sortKey={"status" as keyof MeetingRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-center" />
                    <SortableHeader label="MRR Prev." sortKey={"expectedMRR" as keyof MeetingRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-right" />
                    <SortableHeader label="Prob." sortKey={"probability" as keyof MeetingRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-center" />
                    <SortableHeader label="Receita Esp." sortKey={"expectedRevenue" as keyof MeetingRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-right" />
                    <SortableHeader label="Alerta" sortKey={"alert" as keyof MeetingRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-center" />
                    <th className="h-10 px-4 text-right text-sm font-medium text-muted-foreground">Acoes</th>
                  </tr>
                </thead>
                <TableBody>
                  {meetings.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap">{dateFormat(m.date)}</TableCell>
                      <TableCell className="font-medium">{m.clientLead}</TableCell>
                      <TableCell>{m.channel}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={statusColors[m.status]}>{m.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{currency(m.expectedMRR)}</TableCell>
                      <TableCell className="text-center">{percent(m.probability, 0)}</TableCell>
                      <TableCell className="text-right">{currency(m.expectedRevenue)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={alertColors[m.alert] || "bg-muted"}>{m.alert}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMeeting(m.id)}><Trash2 className="h-4 w-4 text-orbi-rose" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Reuniao" : "Nova Reuniao"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cliente/Lead</Label>
                <Input value={form.clientLead} onChange={(e) => setForm({ ...form, clientLead: e.target.value })} placeholder="Nome" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsavel</Label>
                <Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} placeholder="Quem" />
              </div>
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as MeetingChannel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["WhatsApp", "Presencial", "Telefone", "Indicação", "Instagram", "Outro"] as MeetingChannel[]).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as MeetingType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Primeiro contato", "Follow-up", "Apresentação", "Negociação", "Fechamento"] as MeetingType[]).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as MeetingStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Agendada", "Realizada", "Remarcar", "Proposta enviada", "Fechada", "Perdida"] as MeetingStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>MRR Previsto (R$)</Label>
                <Input type="number" step="0.01" value={form.expectedMRR || ""} onChange={(e) => setForm({ ...form, expectedMRR: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Probabilidade (%)</Label>
                <Input type="number" min="0" max="100" value={Math.round(form.probability * 100) || ""} onChange={(e) => setForm({ ...form, probability: (parseInt(e.target.value) || 0) / 100 })} />
              </div>
              <div className="space-y-2">
                <Label>Proximo Retorno</Label>
                <Input type="date" value={form.nextReturnDate} onChange={(e) => setForm({ ...form, nextReturnDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anotacoes sobre a reuniao..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
