require 'yaml'
require 'tempfile'

root = File.expand_path('..', __dir__)
spec = YAML.load_file(File.join(root, 'packages/shared/openapi.yaml'))

# oapi-codegen v2.4.1 accepts OpenAPI 3.0 nullable but not 3.1 type unions.
walk = lambda do |node|
  case node
  when Hash
    node.keys.each do |key|
      value = node[key]
      if key == 'type' && value.is_a?(Array) && value.include?('null')
        types = value.reject { |type| type == 'null' }
        node[key] = types.length == 1 ? types.first : types
        node['nullable'] = true
      else
        walk.call(value)
      end
    end
  when Array
    node.each { |value| walk.call(value) }
  end
end

walk.call(spec)
spec['openapi'] = '3.0.3'

Tempfile.create(['taiwanhaul-openapi-', '.yaml']) do |file|
  file.write(YAML.dump(spec))
  file.flush
  Dir.chdir(File.join(root, 'apps/search-api')) do
    system('go', 'tool', 'oapi-codegen', '--config=oapi-codegen.yaml', file.path, exception: true)
  end
end
