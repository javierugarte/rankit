-- Allow users to delete their own votes (needed for vote revocation and change)
create policy "Users can delete their own votes"
  on public.votes for delete using (
    auth.uid() = user_id
  );
