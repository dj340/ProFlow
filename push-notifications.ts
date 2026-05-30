// Supabase Edge Function — push-notifications
// Deploy to: supabase/functions/push-notifications/index.ts
// Schedule: every hour via Supabase cron

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const VAPID_PRIVATE = "UUxI4O8-FbRouAevSmBQ6co3DNl5932_3xp9LJ9yMmI";
const VAPID_SUBJECT = "mailto:dj@muhameds.com";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendPushNotification(subscription: any, payload: object) {
  // Use web-push compatible format
  const payloadStr = JSON.stringify(payload);
  
  try {
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: payloadStr,
    });
    return response.ok;
  } catch(e) {
    console.error('Push failed:', e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    // Get all open tasks due today or tomorrow
    const { data: tasks } = await supabase
      .from('pf_tasks')
      .select('*')
      .not('status', 'in', '("done","archived","approved")')
      .or(`due_date.eq.${today},due_date.eq.${tomorrow},due_date.lt.${today}`);

    if (!tasks?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });
    }

    // Get all push subscriptions
    const { data: subs } = await supabase.from('pf_push_subs').select('*');
    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no subscribers' }), { headers: corsHeaders });
    }

    let sent = 0;

    for (const task of tasks) {
      const assigneeIds = (task.assignees || []).map((a: any) => a.id);
      
      const isDueToday = task.due_date === today;
      const isDueTomorrow = task.due_date === tomorrow;
      const isOverdue = task.due_date < today;

      let title = '';
      let body = '';
      let urgent = false;

      if (isOverdue) {
        title = '⚠️ Overdue Task';
        body = `"${task.title}" was due ${task.due_date}`;
        urgent = true;
      } else if (isDueToday) {
        title = '🔴 Due Today';
        body = `"${task.title}" is due today`;
        urgent = true;
      } else if (isDueTomorrow) {
        title = '🟡 Due Tomorrow';
        body = `"${task.title}" is due tomorrow`;
      }

      // Notify each assignee
      for (const userId of assigneeIds) {
        const userSubs = subs.filter((s: any) => s.user_id === userId);
        for (const sub of userSubs) {
          const ok = await sendPushNotification(sub.subscription, {
            title, body, urgent,
            tag: `task-${task.id}`,
            url: '/ProFlow/'
          });
          if (ok) sent++;
        }
      }
    }

    return new Response(JSON.stringify({ sent, tasks: tasks.length }), { headers: corsHeaders });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
