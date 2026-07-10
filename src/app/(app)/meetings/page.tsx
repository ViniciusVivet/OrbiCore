"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Users, CalendarCheck, Send, Handshake } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { currency, dateFormat, percent } from "@/lib/format";
import { meetingAlert, expectedRevenue } from "@/lib/calculations";
import { Meeting, MeetingStatus, MeetingChannel, MeetingType } from "@/lib/types";

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

export default function MeetingsPage() {
  const { data, loaded, addMeeting, updateMeeting, deleteMeeting } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  if (!loaded) return null;

  const meetings = data.meetings.filter(
    (m) => statusFilter === "Todos" || m.status === statusFilter
  );

  const totalRevenue = expectedRevenue(data.meetings);
  const totalMeetings = data.meetings.length;
  const closedCount = data.meetings.filter((m) => m.status === "Fechada").length;
  const proposalCount = data.meetings.filter((m) => m.status === "Proposta enviada").length;

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

      <div className="grid gap-4 md:grid-cols-4">
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

      <div className="flex gap-2 flex-wrap">
        {["Todos", "Agendada", "Realizada", "Remarcar", "Proposta enviada", "Fechada", "Perdida"].map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
            {s}
          </Button>
        ))}
      </div>

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
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente/Lead</TableHead>
                    <TableHead>Responsavel</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">MRR Previsto</TableHead>
                    <TableHead className="text-center">Prob.</TableHead>
                    <TableHead className="text-right">Receita Esp.</TableHead>
                    <TableHead className="text-center">Alerta</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map((m) => {
                    const alert = meetingAlert(m);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap">{dateFormat(m.date)}</TableCell>
                        <TableCell className="font-medium">{m.clientLead}</TableCell>
                        <TableCell>{m.responsible}</TableCell>
                        <TableCell>{m.channel}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={statusColors[m.status]}>{m.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{currency(m.expectedMRR)}</TableCell>
                        <TableCell className="text-center">{percent(m.probability, 0)}</TableCell>
                        <TableCell className="text-right">{currency(m.expectedMRR * m.probability)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={alertColors[alert] || "bg-muted"}>{alert}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteMeeting(m.id)}><Trash2 className="h-4 w-4 text-orbi-rose" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
