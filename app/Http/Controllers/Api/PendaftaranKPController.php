<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PenyelesaianKPResource;
use App\Http\Resources\PerpanjanganKPResource;
use App\Models\Dosen;
use App\Models\PendaftaranKP;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PendaftaranKPController extends Controller
{
    /**
     * Menampilkan pendaftaran KP milik mahasiswa yang sedang login.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        $mahasiswa = $user->mahasiswa;

        if (!$mahasiswa) {
            return response()->json([
                'success' => false,
                'message' => 'Data mahasiswa tidak ditemukan.',
            ], 404);
        }

        $pendaftaran = PendaftaranKP::with([
            'dosenUsulan1.user',
            'dosenUsulan2.user',
            'pembimbing.dosen.user',
            'dokumen',
            'penyelesaian.dokumen',
            'perpanjangan.dokumen',
        ])
            ->where('mahasiswa_id', $mahasiswa->id)
            ->latest()
            ->first();

        if (!$pendaftaran) {
            return response()->json([
                'success' => true,
                'message' => 'Belum ada pendaftaran KP.',
                'data' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data pendaftaran KP berhasil diambil.',
            'data' => [
                'id' => $pendaftaran->id,

                'status' => $pendaftaran->status,
                'catatan' => $pendaftaran->catatan,
                'submitted_at' => $pendaftaran->submitted_at,

                'mahasiswa' => [
                    'id' => $mahasiswa->id,
                    'nomor_induk' => $user->nomor_induk,
                    'name' => $user->name,
                    'email' => $user->email,
                ],

                'data_pribadi' => [
                    'alamat' => $pendaftaran->alamat,
                    'tempat_lahir' => $pendaftaran->tempat_lahir,
                    'tanggal_lahir' => $pendaftaran->tanggal_lahir?->format('Y-m-d'),
                    'email_widyatama' => $pendaftaran->email_widyatama,
                    'nomor_telepon' => $pendaftaran->nomor_telepon,
                    'ipk' => $pendaftaran->ipk,
                ],

                'data_kp' => [
                    'judul_kp' => $pendaftaran->judul_kp,
                ],

                'perusahaan' => [
                    'nama' => $pendaftaran->nama_perusahaan,
                    'bidang_usaha' => $pendaftaran->bidang_usaha,
                    'alamat' => $pendaftaran->alamat_perusahaan,
                    'kota' => $pendaftaran->kota,
                    'kontak' => $pendaftaran->kontak_perusahaan,
                    'pembimbing_lapangan' => $pendaftaran->pembimbing_lapangan,
                ],

                'dosen_usulan' => [
                    'dosen_1' => $pendaftaran->dosenUsulan1
                        ? [
                            'id' => $pendaftaran->dosenUsulan1->id,
                            'nomor_induk' => $pendaftaran->dosenUsulan1->user?->nomor_induk,
                            'name' => $pendaftaran->dosenUsulan1->user?->name,
                            'email' => $pendaftaran->dosenUsulan1->user?->email,
                        ]
                        : null,

                    'dosen_2' => $pendaftaran->dosenUsulan2
                        ? [
                            'id' => $pendaftaran->dosenUsulan2->id,
                            'nomor_induk' => $pendaftaran->dosenUsulan2->user?->nomor_induk,
                            'name' => $pendaftaran->dosenUsulan2->user?->name,
                            'email' => $pendaftaran->dosenUsulan2->user?->email,
                        ]
                        : null,
                ],

                'dosen_pembimbing' => $pendaftaran->pembimbing?->dosen
                    ? [
                        'id' => $pendaftaran->pembimbing->dosen->id,
                        'nomor_induk' => $pendaftaran->pembimbing->dosen->user?->nomor_induk,
                        'name' => $pendaftaran->pembimbing->dosen->user?->name,
                        'email' => $pendaftaran->pembimbing->dosen->user?->email,
                    ]
                    : null,

                'dokumen' => $pendaftaran->dokumen
                    ->map(fn ($dokumen) => [
                        'id' => $dokumen->id,
                        'jenis' => $dokumen->jenis,
                        'nama_file' => $dokumen->nama_file,
                        'ukuran' => $dokumen->ukuran,
                        'mime_type' => $dokumen->mime_type,
                    ])
                    ->values(),

                'penyelesaian' => PenyelesaianKPResource::collection($pendaftaran->penyelesaian)
                    ->resolve($request),

                'perpanjangan' => PerpanjanganKPResource::collection($pendaftaran->perpanjangan)
                    ->resolve($request),
            ],
        ]);
    }

    /**
     * Membuat pendaftaran KP baru.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $mahasiswa = $user->mahasiswa;

        if (!$mahasiswa) {
            return response()->json([
                'success' => false,
                'message' => 'Data mahasiswa tidak ditemukan.',
            ], 404);
        }

        $validated = $request->validate([
            'alamat' => ['required', 'string'],
            'tempat_lahir' => ['required', 'string', 'max:255'],
            'tanggal_lahir' => ['required', 'date'],
            'email_widyatama' => ['required', 'email', 'max:255'],
            'nomor_telepon' => ['required', 'string', 'max:20'],
            'ipk' => ['required', 'numeric', 'min:0', 'max:4'],
            'judul_kp' => ['required', 'string'],

            'dosen_usulan_1_id' => [
                'required',
                'integer',
                'exists:dosens,id',
            ],

            'dosen_usulan_2_id' => [
                'nullable',
                'integer',
                'exists:dosens,id',
                'different:dosen_usulan_1_id',
            ],

            'nama_perusahaan' => ['required', 'string', 'max:255'],
            'bidang_usaha' => ['required', 'string', 'max:255'],
            'alamat_perusahaan' => ['required', 'string'],
            'kota' => ['required', 'string', 'max:255'],
            'kontak_perusahaan' => ['required', 'string', 'max:255'],
            'pembimbing_lapangan' => ['required', 'string', 'max:255'],
        ]);

        /*
         * Satu mahasiswa tidak boleh membuat pendaftaran baru
         * selama masih memiliki pendaftaran yang sedang diproses.
         */
        $existing = PendaftaranKP::where('mahasiswa_id', $mahasiswa->id)
            ->whereIn('status', [
                'PENDING',
                'APPROVED',
            ])
            ->exists();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu sudah memiliki pendaftaran KP yang sedang diproses atau sudah disetujui.',
            ], 409);
        }

        /*
         * Pastikan dosen usulan benar-benar merupakan data dosen.
         */
        $dosenUsulan1 = Dosen::find($validated['dosen_usulan_1_id']);

        if (!$dosenUsulan1) {
            return response()->json([
                'success' => false,
                'message' => 'Dosen usulan 1 tidak ditemukan.',
            ], 422);
        }

        if (
            isset($validated['dosen_usulan_2_id']) &&
            $validated['dosen_usulan_2_id'] !== null
        ) {
            $dosenUsulan2 = Dosen::find($validated['dosen_usulan_2_id']);

            if (!$dosenUsulan2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dosen usulan 2 tidak ditemukan.',
                ], 422);
            }
        }

        $pendaftaran = PendaftaranKP::create([
            'mahasiswa_id' => $mahasiswa->id,

            'dosen_usulan_1_id' => $validated['dosen_usulan_1_id'],
            'dosen_usulan_2_id' => $validated['dosen_usulan_2_id'] ?? null,

            'alamat' => $validated['alamat'],
            'tempat_lahir' => $validated['tempat_lahir'],
            'tanggal_lahir' => $validated['tanggal_lahir'],
            'email_widyatama' => $validated['email_widyatama'],
            'nomor_telepon' => $validated['nomor_telepon'],
            'ipk' => $validated['ipk'],
            'judul_kp' => $validated['judul_kp'],

            'nama_perusahaan' => $validated['nama_perusahaan'],
            'bidang_usaha' => $validated['bidang_usaha'],
            'alamat_perusahaan' => $validated['alamat_perusahaan'],
            'kota' => $validated['kota'],
            'kontak_perusahaan' => $validated['kontak_perusahaan'],
            'pembimbing_lapangan' => $validated['pembimbing_lapangan'],

            'status' => 'PENDING',
            'submitted_at' => now(),
        ]);

        $pendaftaran->load([
            'mahasiswa.user',
            'dosenUsulan1.user',
            'dosenUsulan2.user',
            'pembimbing.dosen.user',
            'dokumen',
        ]);

        $formatDosen = function ($dosen) {
            if (!$dosen || !$dosen->user) {
                return null;
            }

            return [
                'id' => $dosen->id,
                'nomor_induk' => $dosen->user->nomor_induk,
                'name' => $dosen->user->name,
                'email' => $dosen->user->email,
            ];
        };

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran KP berhasil dikirim.',
            'data' => [
                'id' => $pendaftaran->id,

                'mahasiswa' => [
                    'id' => $mahasiswa->id,
                    'nomor_induk' => $user->nomor_induk,
                    'name' => $user->name,
                    'email' => $user->email,
                ],

                'data_pribadi' => [
                    'alamat' => $pendaftaran->alamat,
                    'tempat_lahir' => $pendaftaran->tempat_lahir,
                    'tanggal_lahir' => $pendaftaran->tanggal_lahir->format('Y-m-d'),
                    'email_widyatama' => $pendaftaran->email_widyatama,
                    'nomor_telepon' => $pendaftaran->nomor_telepon,
                    'ipk' => $pendaftaran->ipk,
                ],

                'data_kp' => [
                    'judul_kp' => $pendaftaran->judul_kp,
                    'status' => $pendaftaran->status,
                    'catatan' => $pendaftaran->catatan,
                    'submitted_at' => $pendaftaran->submitted_at,
                ],

                'perusahaan' => [
                    'nama' => $pendaftaran->nama_perusahaan,
                    'bidang_usaha' => $pendaftaran->bidang_usaha,
                    'alamat' => $pendaftaran->alamat_perusahaan,
                    'kota' => $pendaftaran->kota,
                    'kontak' => $pendaftaran->kontak_perusahaan,
                    'pembimbing_lapangan' => $pendaftaran->pembimbing_lapangan,
                ],

                'dosen_usulan' => [
                    'dosen_1' => $formatDosen($pendaftaran->dosenUsulan1),
                    'dosen_2' => $formatDosen($pendaftaran->dosenUsulan2),
                ],

                'dosen_pembimbing' => $formatDosen(
                    $pendaftaran->pembimbing?->dosen
                ),

                'dokumen' => $pendaftaran->dokumen->map(function ($dokumen) {
                    return [
                        'id' => $dokumen->id,
                        'jenis' => $dokumen->jenis,
                        'nama_file' => $dokumen->nama_file,
                        'ukuran' => $dokumen->ukuran,
                        'mime_type' => $dokumen->mime_type,
                    ];
                })->values(),
            ],
        ], 201);

    }


    /*
     * Menampilkan semua pendaftaran KP untuk Staff, Sekprodi, dan Kaprodi.
     */
    public function indexForStaff(Request $request): JsonResponse
    {
        $pendaftaran = PendaftaranKP::with([
            'mahasiswa.user',
            'dosenUsulan1.user',
            'dosenUsulan2.user',
            'pembimbing.dosen.user',
            'dokumen',
            'penyelesaian.dokumen',
            'perpanjangan.dokumen',
        ])
            ->latest()
            ->get();

        $data = $pendaftaran->map(function ($item) {
            $mahasiswa = $item->mahasiswa;
            $mahasiswaUser = $mahasiswa?->user;
            $formatDokumen = function ($dokumen) {
                return [
                    'id' => $dokumen->id,
                    'jenis' => $dokumen->jenis,
                    'nama_file' => $dokumen->nama_file,
                    'ukuran' => $dokumen->ukuran,
                    'mime_type' => $dokumen->mime_type,
                ];
            };

            return [
                'id' => $item->id,

                'status' => $item->status,
                'catatan' => $item->catatan,
                'submitted_at' => $item->submitted_at,

                'mahasiswa' => $mahasiswa
                    ? [
                        'id' => $mahasiswa->id,
                        'nomor_induk' => $mahasiswaUser?->nomor_induk,
                        'name' => $mahasiswaUser?->name,
                        'email' => $mahasiswaUser?->email,
                    ]
                    : null,

                'data_pribadi' => [
                    'alamat' => $item->alamat,
                    'tempat_lahir' => $item->tempat_lahir,
                    'tanggal_lahir' => $item->tanggal_lahir?->format('Y-m-d'),
                    'email_widyatama' => $item->email_widyatama,
                    'nomor_telepon' => $item->nomor_telepon,
                    'ipk' => $item->ipk,
                ],

                'data_kp' => [
                    'judul_kp' => $item->judul_kp,
                ],

                'perusahaan' => [
                    'nama' => $item->nama_perusahaan,
                    'bidang_usaha' => $item->bidang_usaha,
                    'alamat' => $item->alamat_perusahaan,
                    'kota' => $item->kota,
                    'kontak' => $item->kontak_perusahaan,
                    'pembimbing_lapangan' => $item->pembimbing_lapangan,
                ],

                'dosen_usulan' => [
                    'dosen_1' => $item->dosenUsulan1
                        ? [
                            'id' => $item->dosenUsulan1->id,
                            'nomor_induk' => $item->dosenUsulan1->user?->nomor_induk,
                            'name' => $item->dosenUsulan1->user?->name,
                            'email' => $item->dosenUsulan1->user?->email,
                        ]
                        : null,

                    'dosen_2' => $item->dosenUsulan2
                        ? [
                            'id' => $item->dosenUsulan2->id,
                            'nomor_induk' => $item->dosenUsulan2->user?->nomor_induk,
                            'name' => $item->dosenUsulan2->user?->name,
                            'email' => $item->dosenUsulan2->user?->email,
                        ]
                        : null,
                ],

                'dosen_pembimbing' => $item->pembimbing?->dosen
                    ? [
                        'id' => $item->pembimbing->dosen->id,
                        'nomor_induk' => $item->pembimbing->dosen->user?->nomor_induk,
                        'name' => $item->pembimbing->dosen->user?->name,
                        'email' => $item->pembimbing->dosen->user?->email,
                    ]
                    : null,

                'dokumen' => $item->dokumen
                    ->map($formatDokumen)
                    ->values(),

                'penyelesaian' => $item->penyelesaian
                    ->map(function ($penyelesaian) use ($formatDokumen) {
                        return [
                            'id' => $penyelesaian->id,
                            'tahap' => $penyelesaian->tahap,
                            'status' => $penyelesaian->status,
                            'catatan' => $penyelesaian->catatan,
                            'submitted_at' => $penyelesaian->submitted_at,
                            'dokumen' => $penyelesaian->dokumen
                                ->map($formatDokumen)
                                ->values(),
                        ];
                    })
                    ->values(),

                'perpanjangan' => $item->perpanjangan
                    ->map(function ($perpanjangan) use ($formatDokumen) {
                        return [
                            'id' => $perpanjangan->id,
                            'alasan' => $perpanjangan->alasan,
                            'durasi_bulan' => $perpanjangan->durasi_bulan,
                            'status' => $perpanjangan->status,
                            'catatan' => $perpanjangan->catatan,
                            'submitted_at' => $perpanjangan->submitted_at,
                            'dokumen' => $perpanjangan->dokumen
                                ->map($formatDokumen)
                                ->values(),
                        ];
                    })
                    ->values(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'message' => 'Data pendaftaran KP berhasil diambil.',
            'data' => $data,
        ]);
    }



    public function showForStaff(PendaftaranKP $pendaftaran): JsonResponse
    {
        $pendaftaran->load([
            'mahasiswa.user',
            'dosenUsulan1.user',
            'dosenUsulan2.user',
            'pembimbing.dosen.user',
            'dokumen',
            'penyelesaian.dokumen',
            'perpanjangan.dokumen',
        ]);

        $mahasiswa = $pendaftaran->mahasiswa;
        $mahasiswaUser = $mahasiswa?->user;

        $formatDokumen = function ($dokumen) {
            return [
                'id' => $dokumen->id,
                'jenis' => $dokumen->jenis,
                'nama_file' => $dokumen->nama_file,
                'ukuran' => $dokumen->ukuran,
                'mime_type' => $dokumen->mime_type,
            ];
        };

        $data = [
            'id' => $pendaftaran->id,
            'status' => $pendaftaran->status,
            'catatan' => $pendaftaran->catatan,
            'submitted_at' => $pendaftaran->submitted_at,

            'mahasiswa' => $mahasiswa
                ? [
                    'id' => $mahasiswa->id,
                    'nomor_induk' => $mahasiswaUser?->nomor_induk,
                    'name' => $mahasiswaUser?->name,
                    'email' => $mahasiswaUser?->email,
                ]
                : null,

            'data_pribadi' => [
                'alamat' => $pendaftaran->alamat,
                'tempat_lahir' => $pendaftaran->tempat_lahir,
                'tanggal_lahir' => $pendaftaran->tanggal_lahir?->format('Y-m-d'),
                'email_widyatama' => $pendaftaran->email_widyatama,
                'nomor_telepon' => $pendaftaran->nomor_telepon,
                'ipk' => $pendaftaran->ipk,
            ],

            'data_kp' => [
                'judul_kp' => $pendaftaran->judul_kp,
            ],

            'perusahaan' => [
                'nama' => $pendaftaran->nama_perusahaan,
                'bidang_usaha' => $pendaftaran->bidang_usaha,
                'alamat' => $pendaftaran->alamat_perusahaan,
                'kota' => $pendaftaran->kota,
                'kontak' => $pendaftaran->kontak_perusahaan,
                'pembimbing_lapangan' => $pendaftaran->pembimbing_lapangan,
            ],

            'dosen_usulan' => [
                'dosen_1' => $pendaftaran->dosenUsulan1
                    ? [
                        'id' => $pendaftaran->dosenUsulan1->id,
                        'nomor_induk' => $pendaftaran->dosenUsulan1->user?->nomor_induk,
                        'name' => $pendaftaran->dosenUsulan1->user?->name,
                        'email' => $pendaftaran->dosenUsulan1->user?->email,
                    ]
                    : null,

                'dosen_2' => $pendaftaran->dosenUsulan2
                    ? [
                        'id' => $pendaftaran->dosenUsulan2->id,
                        'nomor_induk' => $pendaftaran->dosenUsulan2->user?->nomor_induk,
                        'name' => $pendaftaran->dosenUsulan2->user?->name,
                        'email' => $pendaftaran->dosenUsulan2->user?->email,
                    ]
                    : null,
            ],

            'dosen_pembimbing' => $pendaftaran->pembimbing?->dosen
                ? [
                    'id' => $pendaftaran->pembimbing->dosen->id,
                    'nomor_induk' => $pendaftaran->pembimbing->dosen->user?->nomor_induk,
                    'name' => $pendaftaran->pembimbing->dosen->user?->name,
                    'email' => $pendaftaran->pembimbing->dosen->user?->email,
                ]
                : null,

            'dokumen' => $pendaftaran->dokumen
                ->map($formatDokumen)
                ->values(),

            'penyelesaian' => $pendaftaran->penyelesaian
                ->map(function ($item) use ($formatDokumen) {
                    return [
                        'id' => $item->id,
                        'tahap' => $item->tahap,
                        'status' => $item->status,
                        'catatan' => $item->catatan,
                        'submitted_at' => $item->submitted_at,
                        'dokumen' => $item->dokumen
                            ->map($formatDokumen)
                            ->values(),
                    ];
                })
                ->values(),

            'perpanjangan' => $pendaftaran->perpanjangan
                ->map(function ($item) use ($formatDokumen) {
                    return [
                        'id' => $item->id,
                        'alasan' => $item->alasan,
                        'durasi_bulan' => $item->durasi_bulan,
                        'status' => $item->status,
                        'catatan' => $item->catatan,
                        'submitted_at' => $item->submitted_at,
                        'dokumen' => $item->dokumen
                            ->map($formatDokumen)
                            ->values(),
                    ];
                })
                ->values(),
        ];

        return response()->json([
            'success' => true,
            'message' => 'Detail pendaftaran KP berhasil diambil.',
            'data' => $data,
        ]);
    }



    /*
    * Menyetujui pendaftaran KP.
    */
    public function approve(Request $request, PendaftaranKP $pendaftaran): JsonResponse
    {
        if ($pendaftaran->status !== 'PENDING') {
            return response()->json([
                'success' => false,
                'message' => 'Pendaftaran KP ini tidak sedang menunggu verifikasi.',
            ], 409);
        }

        $pendaftaran->update([
            'status' => 'APPROVED',
            'catatan' => null,
        ]);

        $pendaftaran->load([
            'mahasiswa.user',
            'dosenUsulan1.user',
            'dosenUsulan2.user',
            'pembimbing.dosen.user',
        ]);

        $formatDosen = function ($dosen) {
            if (!$dosen || !$dosen->user) {
                return null;
            }

            return [
                'id' => $dosen->id,
                'nomor_induk' => $dosen->user->nomor_induk,
                'name' => $dosen->user->name,
                'email' => $dosen->user->email,
            ];
        };

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran KP berhasil disetujui.',
            'data' => [
                'id' => $pendaftaran->id,
                'status' => $pendaftaran->status,
                'catatan' => $pendaftaran->catatan,
                'submitted_at' => $pendaftaran->submitted_at,

                'mahasiswa' => [
                    'id' => $pendaftaran->mahasiswa->id,
                    'nomor_induk' => $pendaftaran->mahasiswa->user->nomor_induk,
                    'name' => $pendaftaran->mahasiswa->user->name,
                    'email' => $pendaftaran->mahasiswa->user->email,
                ],

                'data_pribadi' => [
                    'alamat' => $pendaftaran->alamat,
                    'tempat_lahir' => $pendaftaran->tempat_lahir,
                    'tanggal_lahir' => $pendaftaran->tanggal_lahir
                        ? \Illuminate\Support\Carbon::parse($pendaftaran->tanggal_lahir)->format('Y-m-d')
                        : null,
                    'email_widyatama' => $pendaftaran->email_widyatama,
                    'nomor_telepon' => $pendaftaran->nomor_telepon,
                    'ipk' => $pendaftaran->ipk,
                ],

                'data_kp' => [
                    'judul_kp' => $pendaftaran->judul_kp,
                ],

                'perusahaan' => [
                    'nama' => $pendaftaran->nama_perusahaan,
                    'bidang_usaha' => $pendaftaran->bidang_usaha,
                    'alamat' => $pendaftaran->alamat_perusahaan,
                    'kota' => $pendaftaran->kota,
                    'kontak' => $pendaftaran->kontak_perusahaan,
                    'pembimbing_lapangan' => $pendaftaran->pembimbing_lapangan,
                ],

                'dosen_usulan' => [
                    'dosen_1' => $formatDosen($pendaftaran->dosenUsulan1),
                    'dosen_2' => $formatDosen($pendaftaran->dosenUsulan2),
                ],

                'dosen_pembimbing' => $formatDosen(
                    $pendaftaran->pembimbing?->dosen
                ),
            ],
        ]);
    }


    /*
    * Menolak pendaftaran KP.
    */
    public function reject(Request $request, PendaftaranKP $pendaftaran): JsonResponse
    {
        if ($pendaftaran->status !== 'PENDING') {
            return response()->json([
                'success' => false,
                'message' => 'Pendaftaran KP ini tidak sedang menunggu verifikasi.',
            ], 409);
        }

        $validated = $request->validate([
            'catatan' => ['required', 'string', 'max:1000'],
        ]);

        $pendaftaran->update([
            'status' => 'REJECTED',
            'catatan' => $validated['catatan'],
        ]);

        $pendaftaran->load([
            'mahasiswa.user',
            'dosenUsulan1.user',
            'dosenUsulan2.user',
            'pembimbing.dosen.user',
        ]);

        $formatDosen = function ($dosen) {
            if (!$dosen || !$dosen->user) {
                return null;
            }

            return [
                'id' => $dosen->id,
                'nomor_induk' => $dosen->user->nomor_induk,
                'name' => $dosen->user->name,
                'email' => $dosen->user->email,
            ];
        };

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran KP berhasil ditolak.',
            'data' => [
                'id' => $pendaftaran->id,
                'status' => $pendaftaran->status,
                'catatan' => $pendaftaran->catatan,
                'submitted_at' => $pendaftaran->submitted_at,

                'mahasiswa' => [
                    'id' => $pendaftaran->mahasiswa->id,
                    'nomor_induk' => $pendaftaran->mahasiswa->user->nomor_induk,
                    'name' => $pendaftaran->mahasiswa->user->name,
                    'email' => $pendaftaran->mahasiswa->user->email,
                ],

                'data_pribadi' => [
                    'alamat' => $pendaftaran->alamat,
                    'tempat_lahir' => $pendaftaran->tempat_lahir,
                    'tanggal_lahir' => $pendaftaran->tanggal_lahir
                        ? \Illuminate\Support\Carbon::parse($pendaftaran->tanggal_lahir)->format('Y-m-d')
                        : null,
                    'email_widyatama' => $pendaftaran->email_widyatama,
                    'nomor_telepon' => $pendaftaran->nomor_telepon,
                    'ipk' => $pendaftaran->ipk,
                ],

                'data_kp' => [
                    'judul_kp' => $pendaftaran->judul_kp,
                ],

                'perusahaan' => [
                    'nama' => $pendaftaran->nama_perusahaan,
                    'bidang_usaha' => $pendaftaran->bidang_usaha,
                    'alamat' => $pendaftaran->alamat_perusahaan,
                    'kota' => $pendaftaran->kota,
                    'kontak' => $pendaftaran->kontak_perusahaan,
                    'pembimbing_lapangan' => $pendaftaran->pembimbing_lapangan,
                ],

                'dosen_usulan' => [
                    'dosen_1' => $formatDosen($pendaftaran->dosenUsulan1),
                    'dosen_2' => $formatDosen($pendaftaran->dosenUsulan2),
                ],

                'dosen_pembimbing' => $formatDosen(
                    $pendaftaran->pembimbing?->dosen
                ),
            ],
        ]);
    }


    /*
     * Menentukan dosen pembimbing KP.
     */
    public function assignPembimbing(
        Request $request,
        PendaftaranKP $pendaftaran
    ): JsonResponse {
        $validated = $request->validate([
            'dosen_id' => [
                'required',
                'integer',
                'exists:dosens,id',
            ],
        ]);

        if ($pendaftaran->status !== 'APPROVED') {
            return response()->json([
                'success' => false,
                'message' => 'Dosen pembimbing hanya dapat ditentukan untuk pendaftaran yang sudah disetujui.',
            ], 409);
        }

        if ($pendaftaran->pembimbing) {
            return response()->json([
                'success' => false,
                'message' => 'Pendaftaran KP ini sudah memiliki dosen pembimbing.',
            ], 409);
        }

        $pendaftaran->pembimbing()->create([
            'dosen_id' => $validated['dosen_id'],
        ]);

        $pendaftaran->load([
            'mahasiswa.user',
            'dosenUsulan1.user',
            'dosenUsulan2.user',
            'pembimbing.dosen.user',
        ]);

        $formatDosen = function ($dosen) {
            if (!$dosen || !$dosen->user) {
                return null;
            }

            return [
                'id' => $dosen->id,
                'nomor_induk' => $dosen->user->nomor_induk,
                'name' => $dosen->user->name,
                'email' => $dosen->user->email,
            ];
        };

        return response()->json([
            'success' => true,
            'message' => 'Dosen pembimbing KP berhasil ditentukan.',
            'data' => [
                'id' => $pendaftaran->id,
                'status' => $pendaftaran->status,
                'catatan' => $pendaftaran->catatan,
                'submitted_at' => $pendaftaran->submitted_at,

                'mahasiswa' => [
                    'id' => $pendaftaran->mahasiswa->id,
                    'nomor_induk' => $pendaftaran->mahasiswa->user->nomor_induk,
                    'name' => $pendaftaran->mahasiswa->user->name,
                    'email' => $pendaftaran->mahasiswa->user->email,
                ],

                'data_pribadi' => [
                    'alamat' => $pendaftaran->alamat,
                    'tempat_lahir' => $pendaftaran->tempat_lahir,
                    'tanggal_lahir' => $pendaftaran->tanggal_lahir
                        ? \Illuminate\Support\Carbon::parse(
                            $pendaftaran->tanggal_lahir
                        )->format('Y-m-d')
                        : null,
                    'email_widyatama' => $pendaftaran->email_widyatama,
                    'nomor_telepon' => $pendaftaran->nomor_telepon,
                    'ipk' => $pendaftaran->ipk,
                ],

                'data_kp' => [
                    'judul_kp' => $pendaftaran->judul_kp,
                ],

                'perusahaan' => [
                    'nama' => $pendaftaran->nama_perusahaan,
                    'bidang_usaha' => $pendaftaran->bidang_usaha,
                    'alamat' => $pendaftaran->alamat_perusahaan,
                    'kota' => $pendaftaran->kota,
                    'kontak' => $pendaftaran->kontak_perusahaan,
                    'pembimbing_lapangan' => $pendaftaran->pembimbing_lapangan,
                ],

                'dosen_usulan' => [
                    'dosen_1' => $formatDosen($pendaftaran->dosenUsulan1),
                    'dosen_2' => $formatDosen($pendaftaran->dosenUsulan2),
                ],

                'dosen_pembimbing' => $formatDosen(
                    $pendaftaran->pembimbing?->dosen
                ),
            ],
        ]);
    }


    /**
     * Menampilkan mahasiswa KP yang dibimbing oleh dosen yang sedang login.
     */
    public function indexForDosen(Request $request): JsonResponse
    {
        $user = $request->user();

        $dosen = $user->dosen;

        if (!$dosen) {
            return response()->json([
                'success' => false,
                'message' => 'Data dosen tidak ditemukan.',
            ], 404);
        }

        $pembimbing = $dosen->pembimbingKps()
            ->with([
                'pendaftaranKP.mahasiswa.user',
                'pendaftaranKP.dosenUsulan1.user',
                'pendaftaranKP.dosenUsulan2.user',
            ])
            ->latest()
            ->get();

        $data = $pembimbing->map(function ($item) {
            $pendaftaran = $item->pendaftaranKP;
            $mahasiswa = $pendaftaran->mahasiswa;
            $mahasiswaUser = $mahasiswa->user;

            return [
                'pendaftaran_kp_id' => $pendaftaran->id,

                'mahasiswa' => [
                    'id' => $mahasiswa->id,
                    'nomor_induk' => $mahasiswaUser?->nomor_induk,
                    'name' => $mahasiswaUser?->name,
                    'email' => $mahasiswaUser?->email,
                ],

                'data_kp' => [
                    'judul_kp' => $pendaftaran->judul_kp,
                    'status' => $pendaftaran->status,
                ],

                'perusahaan' => [
                    'nama' => $pendaftaran->nama_perusahaan,
                    'bidang_usaha' => $pendaftaran->bidang_usaha,
                    'alamat' => $pendaftaran->alamat_perusahaan,
                    'kota' => $pendaftaran->kota,
                    'kontak' => $pendaftaran->kontak_perusahaan,
                    'pembimbing_lapangan' => $pendaftaran->pembimbing_lapangan,
                ],

                'dosen_usulan' => [
                    'dosen_1' => $pendaftaran->dosenUsulan1
                        ? [
                            'id' => $pendaftaran->dosenUsulan1->id,
                            'nomor_induk' => $pendaftaran->dosenUsulan1->user?->nomor_induk,
                            'name' => $pendaftaran->dosenUsulan1->user?->name,
                            'email' => $pendaftaran->dosenUsulan1->user?->email,
                        ]
                        : null,

                    'dosen_2' => $pendaftaran->dosenUsulan2
                        ? [
                            'id' => $pendaftaran->dosenUsulan2->id,
                            'nomor_induk' => $pendaftaran->dosenUsulan2->user?->nomor_induk,
                            'name' => $pendaftaran->dosenUsulan2->user?->name,
                            'email' => $pendaftaran->dosenUsulan2->user?->email,
                        ]
                        : null,
                ],
            ];
        })->values();

        return response()->json([
            'success' => true,
            'message' => 'Data mahasiswa bimbingan KP berhasil diambil.',
            'data' => $data,
        ]);
    }


    public function showForDosen(
        Request $request,
        PendaftaranKP $pendaftaran
    ): JsonResponse {
        $user = $request->user();

        $dosen = $user->dosen;

        if (!$dosen) {
            return response()->json([
                'success' => false,
                'message' => 'Data dosen tidak ditemukan.',
            ], 404);
        }

        $pendaftaran->load([
            'mahasiswa.user',
            'dosenUsulan1.user',
            'dosenUsulan2.user',
            'pembimbing.dosen.user',
        ]);

        $pembimbing = $pendaftaran->pembimbing;

        // Pastikan pendaftaran ini memang dibimbing oleh dosen yang sedang login.
        if (!$pembimbing || $pembimbing->dosen_id !== $dosen->id) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu tidak memiliki akses ke pendaftaran KP ini.',
            ], 403);
        }

        $mahasiswa = $pendaftaran->mahasiswa;
        $mahasiswaUser = $mahasiswa->user;

        return response()->json([
            'success' => true,
            'message' => 'Detail mahasiswa bimbingan KP berhasil diambil.',
            'data' => [
                'pendaftaran_kp_id' => $pendaftaran->id,

                'mahasiswa' => [
                    'id' => $mahasiswa->id,
                    'nomor_induk' => $mahasiswaUser->nomor_induk,
                    'name' => $mahasiswaUser->name,
                    'email' => $mahasiswaUser->email,
                ],

                'data_pribadi' => [
                'alamat' => $pendaftaran->alamat,
                'tempat_lahir' => $pendaftaran->tempat_lahir,
                'tanggal_lahir' => $pendaftaran->tanggal_lahir?->format('Y-m-d'),
                'email_widyatama' => $pendaftaran->email_widyatama,
                'nomor_telepon' => $pendaftaran->nomor_telepon,
                'ipk' => $pendaftaran->ipk,
                ],

                'data_kp' => [
                    'judul_kp' => $pendaftaran->judul_kp,
                    'status' => $pendaftaran->status,
                    'catatan' => $pendaftaran->catatan,
                    'submitted_at' => $pendaftaran->submitted_at,
                ],

                'perusahaan' => [
                    'nama' => $pendaftaran->nama_perusahaan,
                    'bidang_usaha' => $pendaftaran->bidang_usaha,
                    'alamat' => $pendaftaran->alamat_perusahaan,
                    'kota' => $pendaftaran->kota,
                    'kontak' => $pendaftaran->kontak_perusahaan,
                    'pembimbing_lapangan' => $pendaftaran->pembimbing_lapangan,
                ],

                'dosen_usulan' => [
                    'dosen_1' => $pendaftaran->dosenUsulan1
                        ? [
                            'id' => $pendaftaran->dosenUsulan1->id,
                            'nomor_induk' => $pendaftaran->dosenUsulan1->user?->nomor_induk,
                            'name' => $pendaftaran->dosenUsulan1->user?->name,
                            'email' => $pendaftaran->dosenUsulan1->user?->email,
                        ]
                        : null,

                    'dosen_2' => $pendaftaran->dosenUsulan2
                        ? [
                            'id' => $pendaftaran->dosenUsulan2->id,
                            'nomor_induk' => $pendaftaran->dosenUsulan2->user?->nomor_induk,
                            'name' => $pendaftaran->dosenUsulan2->user?->name,
                            'email' => $pendaftaran->dosenUsulan2->user?->email,
                        ]
                        : null,
                ],

                'dosen_pembimbing' => $pembimbing->dosen
                    ? [
                        'id' => $pembimbing->dosen->id,
                        'nomor_induk' => $pembimbing->dosen->user?->nomor_induk,
                        'name' => $pembimbing->dosen->user?->name,
                        'email' => $pembimbing->dosen->user?->email,
                    ]
                    : null,
            ],
        ]);
    }
}