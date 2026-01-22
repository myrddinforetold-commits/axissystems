-- Add dependency tracking to tasks table
ALTER TABLE public.tasks ADD COLUMN depends_on UUID[] DEFAULT '{}';
ALTER TABLE public.tasks ADD COLUMN dependency_status TEXT DEFAULT 'ready';

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.depends_on IS 'Array of task IDs that must complete before this task can start';
COMMENT ON COLUMN public.tasks.dependency_status IS 'ready, waiting_on_dependencies, or dependencies_met';

-- Index for efficient dependency lookups
CREATE INDEX idx_tasks_depends_on ON public.tasks USING GIN (depends_on);

-- Function to check and update dependency status
CREATE OR REPLACE FUNCTION public.check_task_dependencies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a task completes, check if any tasks depend on it
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update all tasks that depend on this one and have all dependencies now met
    UPDATE public.tasks t
    SET dependency_status = 'dependencies_met'
    WHERE NEW.id = ANY(t.depends_on)
      AND t.dependency_status = 'waiting_on_dependencies'
      AND NOT EXISTS (
        SELECT 1 FROM public.tasks dep 
        WHERE dep.id = ANY(t.depends_on) 
        AND dep.status != 'completed'
      );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to run dependency check on task status updates
CREATE TRIGGER task_dependency_check
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.check_task_dependencies();

-- Function to set initial dependency status on insert
CREATE OR REPLACE FUNCTION public.set_initial_dependency_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If task has dependencies, check if they're all met
  IF NEW.depends_on IS NOT NULL AND array_length(NEW.depends_on, 1) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.tasks dep 
      WHERE dep.id = ANY(NEW.depends_on) 
      AND dep.status != 'completed'
    ) THEN
      NEW.dependency_status := 'waiting_on_dependencies';
    ELSE
      NEW.dependency_status := 'dependencies_met';
    END IF;
  ELSE
    NEW.dependency_status := 'ready';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to set dependency status on insert
CREATE TRIGGER task_set_dependency_status
BEFORE INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_initial_dependency_status();