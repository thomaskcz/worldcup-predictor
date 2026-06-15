-- Enable RLS on predictions table
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view all predictions for a match
-- This is needed for the "OthersPredictions" feature
CREATE POLICY "Authenticated users can view predictions"
  ON predictions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy to allow users to insert their own predictions
CREATE POLICY "Users can insert their own predictions"
  ON predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own predictions
CREATE POLICY "Users can update their own predictions"
  ON predictions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own predictions
CREATE POLICY "Users can delete their own predictions"
  ON predictions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
