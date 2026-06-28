import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { ensureAuthenticated } from '@/lib/auth-session';

export type BetaFeedbackInput = {
  feedbackText?: string;
  mostValuableFeature?: string;
  mostFrustrating?: string;
};

export async function submitBetaFeedback(
  input: BetaFeedbackInput,
): Promise<{ error: string | null }> {
  const { userId, error: authError } = await ensureAuthenticated();
  if (authError || !userId) return { error: authError ?? 'You must be signed in.' };

  const hasContent =
    Boolean(input.feedbackText?.trim()) ||
    Boolean(input.mostValuableFeature?.trim()) ||
    Boolean(input.mostFrustrating?.trim());

  if (!hasContent) {
    return { error: 'Please share at least one thought before sending.' };
  }

  const { error } = await supabase.from('beta_feedback').insert({
    user_id: userId,
    feedback_text: input.feedbackText?.trim() || null,
    most_valuable_feature: input.mostValuableFeature?.trim() || null,
    most_frustrating: input.mostFrustrating?.trim() || null,
    app_version: Constants.expoConfig?.version ?? 'unknown',
    platform: Platform.OS,
  });

  if (error) {
    if (error.message.includes('beta_feedback')) {
      return {
        error: 'Feedback could not be saved. Run migration 015 (beta_feedback) in Supabase.',
      };
    }
    return { error: error.message };
  }

  return { error: null };
}
