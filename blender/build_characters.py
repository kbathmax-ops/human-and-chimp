"""Original faceted characters, authored in Blender; coordinates specified Y-up.
Run: blender --background --python blender/build_characters.py -- /path/to/project
Meshes use rigid joint parents so every limb remains editable without skin weights.
"""
import bpy, math, os, sys
from mathutils import Vector

OUT=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else os.path.dirname(os.path.dirname(__file__))
os.makedirs(os.path.join(OUT,'public','models'),exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
MATS={}
def material(hexcolor):
    if hexcolor in MATS:return MATS[hexcolor]
    raw=tuple(int(hexcolor[i:i+2],16)/255 for i in (1,3,5))
    c=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in raw)
    m=bpy.data.materials.new(hexcolor);m.diffuse_color=(*c,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=.87
    MATS[hexcolor]=m;return m
def pos(p):return (p[0],-p[2],p[1])
def joint(name,parent=None,p=(0,0,0)):
    ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob);ob.parent=parent;ob.location=pos(p);ob.empty_display_type='PLAIN_AXES';ob.empty_display_size=.09;return ob
def poly(name,parent,verts,faces,color,p=(0,0,0),facets=False):
    data=bpy.data.meshes.new(name);data.from_pydata([pos(v) for v in verts],[],faces);data.update()
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.parent=parent;ob.location=pos(p)
    colors=[color]
    if facets:
        rgb=[int(color[i:i+2],16) for i in (1,3,5)]
        colors+=['#'+''.join(f'{min(255,int(v*f)):02x}' for v in rgb) for f in (.88,1.09)]
    for c in colors:data.materials.append(material(c))
    for face in data.polygons:face.use_smooth=False;face.material_index=(face.index%9==2)+2*(face.index%9==5) if facets else 0
    return ob
def shape(name,parent,rings,color,p=(0,0,0),cut=.22):
    # An eight-sided chamfered rectangle at each height: broad planes, no spheres.
    verts=[]
    for y,w,d in rings:
        x=w/2;z=d/2;verts += [(xx,y,zz) for xx,zz in [(-x+cut*w,z),(x-cut*w,z),(x,z-cut*d),(x,-z+cut*d),(x-cut*w,-z),(-x+cut*w,-z),(-x,-z+cut*d),(-x,z-cut*d)]]
    faces=[tuple(range(7,-1,-1))]
    for r in range(len(rings)-1):
        for i in range(8):faces.append((r*8+i,r*8+(i+1)%8,(r+1)*8+(i+1)%8,(r+1)*8+i))
    faces.append(tuple((len(rings)-1)*8+i for i in range(8)))
    return poly(name,parent,verts,faces,color,p,True)
def box(name,parent,w,h,d,p,color):return shape(name,parent,[(-h/2,w,d),(h/2,w,d)],color,p,.13)
def face(name,parent,points,color):return poly(name,parent,points,[tuple(range(len(points)))],color)
def human():
    root=joint('human');body=joint('human_body',root)
    skin='#bd8c6c';light='#d5a27a';dark='#996d58';shirt='#487172';pants='#283e46';hair='#282d2c';sole='#d7c4a0'
    shape('Tshirt_cut',body,[(1.38,.60,.36),(1.62,.63,.38),(1.98,.85,.46),(2.17,.73,.42),(2.23,.27,.28)],shirt)
    box('Tshirt_hem',body,.63,.07,.40,(0,1.42,0),'#344e51')
    face('Collar_V',body,[(-.13,2.225,.19),(.13,2.225,.19),(0,2.10,.249)],'#263f42')
    face('Shirt_fold',body,[(.12,1.52,.206),(.25,1.73,.219),(.22,1.44,.213)],'#3c6062')
    box('Pocket',body,.18,.18,.022,(.21,1.96,.239),'#375b60');box('Pocket_trim',body,.18,.025,.027,(.21,2.04,.25),'#bb7250')
    shape('Neck',body,[(2.15,.22,.24),(2.40,.23,.24)],skin)
    head=joint('human_head',body,(0,2.57,0))
    shape('Young_face',head,[(-.25,.27,.28),(-.15,.43,.38),(.12,.51,.43),(.29,.47,.40),(.34,.35,.33)],skin,cut=.21)
    face('Cheek_L',head,[(-.24,.035,.159),(-.18,-.13,.192),(-.08,-.15,.203),(-.08,.01,.225)],light)
    face('Cheek_R',head,[(.24,.035,.159),(.18,-.13,.192),(.08,-.15,.203),(.08,.01,.225)],'#b17f64')
    for s in [-1,1]:
        box('Ear',head,.085,.17,.095,(s*.274,.005,-.005),skin)
        box('Ear_inner',head,.027,.085,.02,(s*.294,.005,.054),dark)
        box('Eye_white',head,.126,.066,.016,(s*.12,.064,.221),'#e5dfcc')
        box('Iris',head,.041,.061,.018,(s*.11,.063,.233),'#52645a')
        box('Pupil',head,.022,.051,.011,(s*.11,.063,.245),'#26302d')
        box('Eyebrow',head,.147,.027,.022,(s*.116,.121,.228),hair)
    poly('Nose',head,[(-.048,.07,.223),(.048,.07,.223),(-.065,-.06,.233),(.065,-.06,.233),(0,-.035,.327)],[(0,1,4),(1,3,4),(3,2,4),(2,0,4)],light)
    box('Mouth',head,.13,.014,.012,(0,-.151,.207),'#79584c')
    shape('Cropped_hair',head,[(.17,.52,.46),(.36,.55,.45),(.46,.39,.34)],hair,p=(0,0,-.025))
    for i in range(5):
        x=-.24+i*.095
        poly('Hair_fringe',head,[(x,.30,.227),(x+.13,.33,.24),(x+.09,.095+(i%2)*.06,.248),(x+.025,.13,.225)],[(0,1,2),(0,2,3)],'#252c2c')
    shape('Hips',body,[(1.16,.65,.40),(1.39,.63,.38)],pants)
    box('Belt',body,.65,.066,.411,(0,1.35,0),'#414237');box('Buckle',body,.105,.084,.028,(0,1.35,.221),'#b4a478')
    for s,label in [(-1,'L'),(1,'R')]:
        hip=joint('human_hip_'+label,body,(s*.195,1.21,0))
        shape('Trouser_thigh_'+label,hip,[(-.62,.29,.34),(-.11,.34,.39),(.03,.31,.35)],pants)
        box('Trouser_seam',hip,.019,.47,.028,(s*.159,-.26,.15),'#475963')
        knee=joint('human_knee_'+label,hip,(0,-.60,0))
        shape('Trouser_calf_'+label,knee,[(-.48,.27,.29),(-.34,.30,.32),(.04,.29,.35)],pants)
        box('Cuff',knee,.32,.085,.35,(0,-.45,.006),'#1e333a')
        shape('Sneaker_'+label,knee,[(-.57,.37,.63),(-.42,.37,.60),(-.33,.25,.35)],'#394b49',p=(0,0,.115))
        box('Sole',knee,.38,.065,.64,(0,-.58,.12),sole)
        box('Toe_panel',knee,.31,.07,.23,(0,-.49,.34),'#bd7750')
        for i in range(3):box('Lace',knee,.17,.015,.035,(0,-.35-i*.025,.14+i*.065),sole)
        shoulder=joint('human_shoulder_'+label,body,(s*.46,2.10,0))
        shape('Sleeve_'+label,shoulder,[(-.28,.31,.36),(.05,.34,.35)],shirt)
        box('Sleeve_hem',shoulder,.315,.042,.37,(0,-.255,0),'#35585c')
        shape('Upper_arm_'+label,shoulder,[(-.49,.21,.23),(-.23,.27,.28)],skin)
        elbow=joint('human_elbow_'+label,shoulder,(0,-.47,0))
        shape('Forearm_'+label,elbow,[(-.37,.17,.19),(-.08,.24,.24),(.025,.205,.22)],skin)
        hand=joint('human_hand_'+label,elbow,(0,-.40,0))
        box('Palm_'+label,hand,.215,.225,.14,(0,-.065,.017),light)
        for i in range(4):box('Finger',hand,.045,.135,.10,((i-1.5)*.05,-.203,.04),skin)
        box('Thumb',hand,.083,.145,.13,(-s*.136,-.075,.075),skin)
        if s==1:box('Wristband',elbow,.19,.057,.21,(0,-.335,0),'#ac6546')
    return root
def chimp():
    root=joint('chimp');body=joint('chimp_body',root);fur='#393a30';edge='#4b493b';skin='#99816b';dark='#66594c'
    shape('Chimp_torso',body,[(.54,.64,.52),(.85,.87,.64),(1.31,1.02,.70),(1.59,1.14,.67),(1.78,.73,.49)],fur,p=(0,0,-.035),cut=.27)
    for s in [-1,1]:
        face('Chest_plane',body,[(s*.07,1.50,.333),(s*.40,1.49,.299),(s*.35,1.22,.336),(s*.075,1.21,.35)],'#5b5142')
    head=joint('chimp_head',body,(0,1.85,.19))
    shape('Cranium',head,[(-.26,.46,.40),(-.10,.67,.57),(.25,.66,.56),(.44,.42,.40)],fur,cut=.28)
    shape('Face_mask',head,[(-.18,.43,.16),(.06,.55,.20),(.23,.49,.15)],dark,p=(0,0,.263))
    for s in [-1,1]:
        shape('Ear',head,[(-.14,.17,.11),(0,.25,.14),(.15,.17,.09)],skin,p=(s*.375,.07,.006),cut=.28)
        box('Ear_inset',head,.115,.17,.019,(s*.388,.07,.085),'#6d5c4e')
        box('Eye_socket',head,.215,.17,.08,(s*.14,.11,.367),'#504a3e')
        box('Eye',head,.103,.071,.025,(s*.14,.098,.414),'#bea884')
        box('Iris',head,.051,.064,.024,(s*.139,.10,.432),'#766043')
        box('Pupil',head,.026,.051,.013,(s*.139,.10,.446),'#222a26')
        box('Brow_ridge',head,.265,.069,.13,(s*.125,.206,.366),skin)
    shape('Muzzle',head,[(-.18,.32,.22),(-.08,.44,.31),(.01,.31,.22)],skin,p=(0,0,.396),cut=.24)
    box('Nose_bridge',head,.21,.097,.145,(0,.001,.468),'#7c6a58')
    for s in [-1,1]:box('Nostril',head,.046,.027,.011,(s*.060,-.015,.545),'#35392f')
    jaw=joint('chimp_jaw',head,(0,-.19,.32))
    shape('Lower_jaw',jaw,[(-.14,.26,.18),(-.06,.39,.27),(.01,.40,.25)],skin,p=(0,0,.128))
    box('Lips',jaw,.31,.027,.026,(0,-.007,.276),'#4f483d')
    for i in range(6):box('Tooth',jaw,.032,.021,.018,((i-2.5)*.039,-.007,.290),'#c9b695')
    for s,label in [(-1,'L'),(1,'R')]:
        hip=joint('chimp_hip_'+label,body,(s*.28,.74,-.04))
        shape('Chimp_thigh_'+label,hip,[(-.38,.29,.34),(-.12,.44,.49),(.10,.37,.40)],fur)
        knee=joint('chimp_knee_'+label,hip,(0,-.37,.10))
        shape('Chimp_shin_'+label,knee,[(-.28,.245,.27),(-.12,.29,.31),(.04,.29,.34)],edge)
        box('Foot',knee,.32,.14,.47,(0,-.28,.16),dark)
        for i in range(4):box('Toe',knee,.067,.092,.21,((i-1.5)*.075,-.30,.405),skin)
        box('Big_toe',knee,.115,.11,.26,(-s*.193,-.29,.24),skin)
        shoulder=joint('chimp_shoulder_'+label,body,(s*.57,1.59,0))
        shape('Chimp_upper_arm_'+label,shoulder,[(-.65,.27,.30),(-.38,.36,.40),(-.02,.44,.46),(.10,.36,.38)],fur)
        elbow=joint('chimp_elbow_'+label,shoulder,(0,-.63,.018))
        shape('Chimp_forearm_'+label,elbow,[(-.54,.24,.24),(-.26,.34,.34),(.03,.29,.31)],edge)
        hand=joint('chimp_hand_'+label,elbow,(0,-.54,.024))
        box('Chimp_palm_'+label,hand,.30,.26,.20,(0,-.06,.035),dark)
        for i in range(4):
            x=(i-1.5)*.070;box('Chimp_finger',hand,.062,.23,.09,(x,-.25,.039),skin);box('Curled_tip',hand,.061,.095,.13,(x,-.33,.084),dark)
        box('Chimp_thumb',hand,.10,.18,.12,(-s*.19,-.095,.09),skin)
    # Fur is sculpted as broad angular locks, not spikes or a hair simulation.
    for s in [-1,1]:
        for i in range(4):
            x=s*(.41-i*.038);y=1.42-i*.18
            poly('Fur_lock',body,[(x-s*.12,y,.27),(x+s*.06,y+.07,.19),(x+s*.05,y-.20,.20)],[(0,1,2)],edge)
    return root

h=human();c=chimp()
for root in [h,c]:
    bpy.ops.object.select_all(action='DESELECT')
    for ob in [root]+list(root.children_recursive):ob.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'public','models',root.name+'.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True)

# The editable scene includes both figures and a studio render setup.
h.location.x=-1.0;c.location.x=1.0
world=bpy.context.scene.world or bpy.data.worlds.new('Studio');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.73,.71,.63,1);world.node_tree.nodes['Background'].inputs[1].default_value=.7
bpy.ops.mesh.primitive_plane_add(size=200);plane=bpy.context.object;plane.name='Studio_floor';plane.data.materials.append(material('#cfc5aa'))
for loc,power,size in [((-4,-6,8),950,5),((5,-2,5),550,4),((0,4,6),800,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size;lamp.rotation_euler=(Vector((0,0,1.4))-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(5,-9,4.3));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1.42))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=5.3
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'blender','character-study.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'blender','Human-and-Chimp.blend'))
bpy.ops.render.render(write_still=True)
