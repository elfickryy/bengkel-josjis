import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ymgizoqdlmjpvubdqaqu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZ2l6b3FkbG1qcHZ1YmRxYXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NTQxNDAsImV4cCI6MjEwNTAzMDE0MH0.X_zttDkht280Ko-9LV3JM6Sbt8MI2NW2zjzj-ZMEPPk'

export const supabase = createClient(supabaseUrl, supabaseKey)