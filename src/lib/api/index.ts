import { isDemo } from '../config'
import type { Api } from '../types'
import { demoApi } from './demo-teach'
import { supabaseCore } from './supabase'
import { supabaseTeach } from './supabase-teach'

const liveApi: Api = { ...supabaseCore, ...supabaseTeach }
export const api: Api = isDemo ? demoApi : liveApi
