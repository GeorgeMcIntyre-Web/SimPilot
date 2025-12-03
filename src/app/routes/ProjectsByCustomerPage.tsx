import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { useProjects, useAreas } from '../../domain/coreStore';
import { Project, Area } from '../../domain/core';
import { StatusPill } from '../../ui/components/StatusPill';

interface ProjectWithAreas extends Project {
  areas: Area[];
}

interface CustomerGroup {
  customer: string;
  projects: ProjectWithAreas[];
}

export function ProjectsByCustomerPage() {
  const projects = useProjects();
  const allAreas = useAreas();

  // Group projects by customer
  const customerGroups = useMemo(() => {
    const groups = new Map<string, ProjectWithAreas[]>();

    projects.forEach(project => {
      const customer = project.customer || 'Unknown';
      if (!groups.has(customer)) {
        groups.set(customer, []);
      }
      
      const projectAreas = allAreas.filter(a => a.projectId === project.id);
      groups.get(customer)!.push({
        ...project,
        areas: projectAreas
      });
    });

    // Convert to array and sort
    return Array.from(groups.entries())
      .map(([customer, projects]) => ({
        customer,
        projects: projects.sort((a, b) => a.name.localeCompare(b.name))
      }))
      .sort((a, b) => a.customer.localeCompare(b.customer));
  }, [projects, allAreas]);

  if (customerGroups.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="Projects by Customer" subtitle="View all projects organized by customer" />
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">No Projects Found</h3>
          <p className="text-blue-700 dark:text-blue-300 mb-4">
            Please go to the Data Loader to import your simulation files.
          </p>
          <Link to="/data-loader" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            Go to Data Loader
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Projects by Customer" 
        subtitle={`${projects.length} projects across ${customerGroups.length} customers`}
      />

      {customerGroups.map((group: CustomerGroup) => (
        <div key={group.customer} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          {/* Customer Header */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Customer: {group.customer}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {group.projects.length} project{group.projects.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Projects */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {group.projects.map((project: ProjectWithAreas) => (
              <div key={project.id} className="p-6">
                {/* Project Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Link 
                      to={`/projects/${project.id}`}
                      className="text-lg font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {project.name}
                    </Link>
                    <div className="flex items-center gap-3 mt-1">
                      <StatusPill status={project.status} />
                      {project.manager && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Manager: {project.manager}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Areas */}
                {project.areas.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Areas ({project.areas.length}):
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {project.areas.map((area: Area) => (
                        <span
                          key={area.id}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        >
                          {area.name}
                          {area.code && (
                            <span className="ml-1 text-gray-500">({area.code})</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 italic">
                    No areas defined for this project
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


